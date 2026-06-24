pub mod ghidra;
pub mod static_analysis;
pub mod types;

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::Utc;
use uuid::Uuid;

pub use types::*;

use crate::HistoryBridge;

use self::ghidra::run_ghidra_headless;
use self::static_analysis::{analyze_static, extract_strings, hash_file, scan_yara};

pub fn import_sample(
    app_data_dir: &Path,
    source_path: &Path,
    history: &HistoryBridge,
) -> Result<ThreatSample, String> {
    let sample_id = Uuid::new_v4().to_string();
    let file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("sample")
        .to_string();
    let sample_dir = app_data_dir
        .join("threats")
        .join("samples")
        .join(&sample_id);
    fs::create_dir_all(&sample_dir).map_err(|error| error.to_string())?;

    let (bytes, stored_path) = if source_path.is_dir() {
        let archive_bytes = create_tar_gz(source_path)?;
        let stored = sample_dir.join("sample.tar.gz");
        fs::write(&stored, &archive_bytes).map_err(|error| error.to_string())?;
        (archive_bytes, stored)
    } else {
        let bytes = fs::read(source_path).map_err(|error| error.to_string())?;
        let stored = sample_dir.join("sample");
        fs::write(&stored, &bytes).map_err(|error| error.to_string())?;
        (bytes, stored)
    };

    let hashes = hash_file(&bytes);
    let now = Utc::now().to_rfc3339();
    let sample = ThreatSample {
        id: sample_id,
        file_name,
        original_path: source_path.display().to_string(),
        stored_path: stored_path.display().to_string(),
        size: bytes.len() as u64,
        sha256: hashes.sha256,
        created_at: now.clone(),
        updated_at: now,
    };
    history.upsert_threat_sample(&sample)?;
    Ok(sample)
}

fn create_tar_gz(source_dir: &Path) -> Result<Vec<u8>, String> {
    let tar_bytes = {
        let mut archive = tar::Builder::new(Vec::new());
        archive.follow_symlinks(false);
        archive
            .append_dir_all(".", source_dir)
            .map_err(|e| format!("Failed to build tar archive: {e}"))?;
        archive
            .into_inner()
            .map_err(|e| format!("Failed to finalize tar archive: {e}"))?
    };
    let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    gz.write_all(&tar_bytes)
        .map_err(|e| format!("Failed to compress archive: {e}"))?;
    gz.finish()
        .map_err(|e| format!("Failed to finalize gzip: {e}"))
}

fn is_archive_path(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map_or(false, |name| name.ends_with(".tar.gz"))
}

fn extract_tar_gz(archive_path: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    let file = fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let gz = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(gz);
    archive
        .unpack(dest)
        .map_err(|e| format!("Failed to extract archive: {e}"))
}

fn find_main_binary(dir: &Path) -> Option<PathBuf> {
    // macOS .app bundle: Contents/MacOS/*
    let macos_dir = dir.join("Contents").join("MacOS");
    if macos_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&macos_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    return Some(p);
                }
            }
        }
    }

    // Fallback: walk directory tree for first regular file
    fn walk(dir: &Path) -> Option<PathBuf> {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    return Some(p);
                }
                if p.is_dir() {
                    if let Some(found) = walk(&p) {
                        return Some(found);
                    }
                }
            }
        }
        None
    }
    walk(dir)
}

fn collect_all_file_bytes(dir: &Path) -> Result<Vec<u8>, String> {
    let mut all = Vec::new();
    fn walk(dir: &Path, all: &mut Vec<u8>) -> Result<(), String> {
        for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
            let p = entry.path();
            if p.is_file() {
                let bytes = std::fs::read(&p).map_err(|e| e.to_string())?;
                all.extend_from_slice(&bytes);
            } else if p.is_dir() {
                walk(&p, all)?;
            }
        }
        Ok(())
    }
    walk(dir, &mut all)?;
    Ok(all)
}

pub fn run_analysis(
    app_data_dir: &Path,
    sample: &ThreatSample,
    options: ThreatAnalysisOptions,
    ghidra_path: Option<String>,
    scripts_dir: PathBuf,
    history: &HistoryBridge,
) -> Result<ThreatAnalysisResult, String> {
    let run = create_analysis_run(sample);
    history.insert_threat_analysis_run(&run)?;
    finish_analysis_run(
        app_data_dir,
        sample,
        options,
        ghidra_path,
        scripts_dir,
        history,
        run,
        || false,
        |_| {},
    )
}

pub fn create_analysis_run(sample: &ThreatSample) -> ThreatAnalysisRun {
    ThreatAnalysisRun {
        id: Uuid::new_v4().to_string(),
        sample_id: sample.id.clone(),
        status: ThreatAnalysisStatus::Running,
        started_at: Utc::now().to_rfc3339(),
        finished_at: None,
        error: None,
        logs: Vec::new(),
    }
}

pub fn finish_analysis_run<F>(
    app_data_dir: &Path,
    sample: &ThreatSample,
    options: ThreatAnalysisOptions,
    ghidra_path: Option<String>,
    scripts_dir: PathBuf,
    history: &HistoryBridge,
    mut run: ThreatAnalysisRun,
    is_cancelled: F,
    on_log: impl Fn(&str),
) -> Result<ThreatAnalysisResult, String>
where
    F: Fn() -> bool,
{
    push_run_log(&mut run, "Analysis queued", &on_log);

    if is_cancelled() {
        run.status = ThreatAnalysisStatus::Cancelled;
        run.finished_at = Some(Utc::now().to_rfc3339());
        push_run_log(&mut run, "Analysis cancelled before it started", &on_log);
        history.update_threat_analysis_run(&run)?;
        return Err("Analysis cancelled".to_string());
    }

    let result = run_analysis_inner(
        app_data_dir,
        sample,
        &options,
        ghidra_path,
        scripts_dir,
        &is_cancelled,
        &on_log,
    );
    run.finished_at = Some(Utc::now().to_rfc3339());

    match result {
        Ok(artifacts) => {
            if is_cancelled() {
                run.status = ThreatAnalysisStatus::Cancelled;
                push_run_log(
                    &mut run,
                    "Analysis cancelled after engine execution",
                    &on_log,
                );
                history.update_threat_analysis_run(&run)?;
                return Err("Analysis cancelled".to_string());
            }

            push_run_log(&mut run, "Persisting analysis artifacts", &on_log);
            let now = Utc::now().to_rfc3339();
            history.upsert_threat_artifacts(&sample.id, &artifacts, &now)?;
            run.status = ThreatAnalysisStatus::Completed;
            push_run_log(&mut run, "Analysis completed", &on_log);
            history.update_threat_analysis_run(&run)?;
            history
                .get_threat_analysis(&sample.id)?
                .ok_or_else(|| "Analysis result was not found after completion".to_string())
        }
        Err(error) => {
            run.status = if error == "Analysis cancelled" {
                ThreatAnalysisStatus::Cancelled
            } else {
                ThreatAnalysisStatus::Failed
            };
            run.error = Some(error.clone());
            push_run_log(&mut run, &error, &on_log);
            history.update_threat_analysis_run(&run)?;
            Err(error)
        }
    }
}

fn run_analysis_inner(
    app_data_dir: &Path,
    sample: &ThreatSample,
    options: &ThreatAnalysisOptions,
    ghidra_path: Option<String>,
    scripts_dir: PathBuf,
    is_cancelled: &dyn Fn() -> bool,
    on_log: &dyn Fn(&str),
) -> Result<ThreatArtifacts, String> {
    if is_cancelled() {
        return Err("Analysis cancelled".to_string());
    }

    on_log("Reading imported sample");
    let sample_path = PathBuf::from(&sample.stored_path);

    let (bytes, ghidra_import_path) = if is_archive_path(&sample_path) {
        let contents_dir = sample_path
            .parent()
            .ok_or_else(|| "Invalid stored sample path".to_string())?
            .join("contents");
        if !contents_dir.exists() {
            on_log("Extracting archived sample for analysis");
            extract_tar_gz(&sample_path, &contents_dir)?;
        }
        let binary_path = find_main_binary(&contents_dir).ok_or_else(|| {
            format!("No executable binary found in archive. Import the binary directly instead.")
        })?;
        on_log(&format!(
            "Found binary: {}",
            binary_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
        ));
        let binary_bytes = fs::read(&binary_path).map_err(|error| error.to_string())?;
        (binary_bytes, contents_dir)
    } else {
        let bytes = fs::read(&sample_path).map_err(|error| error.to_string())?;
        (bytes, sample_path.clone())
    };
    let mut yara_rule_sources = options
        .enabled_yara_rule_paths
        .iter()
        .map(|path| {
            let label = Path::new(path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(path)
                .to_string();
            (label, path.clone())
        })
        .collect::<Vec<_>>();
    if let Some(path) = options
        .yara_rules_path
        .as_ref()
        .filter(|path| !path.trim().is_empty())
    {
        let label = Path::new(path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Selected rules")
            .to_string();
        yara_rule_sources.push((label, path.clone()));
    }

    on_log("Running static analysis");
    let mut artifacts = analyze_static(&bytes, &yara_rule_sources)?;
    // For archives: augment strings and YARA by scanning all files in the bundle
    if is_archive_path(&sample_path) {
        on_log("Scanning all files in bundle for strings and YARA");
        let contents_dir = sample_path.parent().unwrap().join("contents");
        let all_bytes = collect_all_file_bytes(&contents_dir)?;
        artifacts.strings.extend(extract_strings(&all_bytes, 4));
        artifacts.yara = scan_yara(&all_bytes, &yara_rule_sources)?;
    }

    let artifact_dir = app_data_dir
        .join("threats")
        .join("artifacts")
        .join(&sample.id);
    fs::create_dir_all(&artifact_dir).map_err(|error| error.to_string())?;
    on_log("Writing static analysis artifacts");
    write_artifact_files(&artifact_dir, &artifacts)?;

    if is_cancelled() {
        return Err("Analysis cancelled".to_string());
    }

    if options.run_ghidra {
        on_log("Starting Ghidra Headless");
        let ghidra_path = ghidra_path
            .filter(|path| !path.trim().is_empty())
            .ok_or_else(|| {
                "Configure Ghidra Headless in Settings before running Ghidra analysis".to_string()
            })?;
        let project_root = app_data_dir.join("threats").join("ghidra-projects");
        let ghidra_result = run_ghidra_headless(
            Path::new(&ghidra_path),
            &ghidra_import_path,
            &sample.id,
            &project_root,
            &scripts_dir,
            &artifact_dir,
            Duration::from_secs(15 * 60),
            is_cancelled,
        )?;
        on_log("Ghidra exporters completed");
        artifacts.functions = ghidra_result.artifacts.functions;
        artifacts.decompiled = ghidra_result.artifacts.decompiled;
        artifacts.call_graph = ghidra_result.artifacts.call_graph;
        for log in ghidra_result
            .logs
            .iter()
            .filter(|log| !log.trim().is_empty())
        {
            on_log(log.trim());
        }
    }

    on_log("Writing final analysis artifacts");
    write_artifact_files(&artifact_dir, &artifacts)?;
    Ok(artifacts)
}

pub fn write_artifact_files(
    artifact_dir: &Path,
    artifacts: &ThreatArtifacts,
) -> Result<(), String> {
    fs::create_dir_all(artifact_dir).map_err(|error| error.to_string())?;
    write_json(artifact_dir.join("metadata.json"), &artifacts.metadata)?;
    write_json(artifact_dir.join("hashes.json"), &artifacts.hashes)?;
    write_json(artifact_dir.join("strings.json"), &artifacts.strings)?;
    write_json(artifact_dir.join("imports.json"), &artifacts.imports)?;
    write_json(artifact_dir.join("exports.json"), &artifacts.exports)?;
    write_json(artifact_dir.join("entropy.json"), &artifacts.entropy)?;
    write_json(artifact_dir.join("yara.json"), &artifacts.yara)?;
    write_json(artifact_dir.join("functions.json"), &artifacts.functions)?;
    write_json(artifact_dir.join("decompiled.json"), &artifacts.decompiled)?;
    write_json(artifact_dir.join("callgraph.json"), &artifacts.call_graph)?;
    Ok(())
}

fn write_json<T: serde::Serialize>(path: PathBuf, value: &T) -> Result<(), String> {
    let content = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn push_run_log(run: &mut ThreatAnalysisRun, message: &str, on_log: &impl Fn(&str)) {
    run.logs.push(message.to_string());
    on_log(message);
}
