use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use super::types::{
    GhidraCallGraph, GhidraDecompiledFunction, GhidraFunction, GhidraValidationResult,
    ThreatArtifacts,
};

pub struct GhidraRunResult {
    pub artifacts: ThreatArtifacts,
    pub logs: Vec<String>,
}

pub fn validate_ghidra_headless_path(path: &str) -> GhidraValidationResult {
    let executable = Path::new(path);
    if !executable.exists() {
        return GhidraValidationResult {
            valid: false,
            message: "Path does not exist".to_string(),
            path: path.to_string(),
        };
    }

    if !executable.is_file() {
        return GhidraValidationResult {
            valid: false,
            message: "Path is not a file".to_string(),
            path: path.to_string(),
        };
    }

    let output = Command::new(executable).arg("-help").output();
    match output {
        Ok(output)
            if output.status.success()
                || !output.stderr.is_empty()
                || !output.stdout.is_empty() =>
        {
            GhidraValidationResult {
                valid: true,
                message: "Ghidra Headless executable is reachable".to_string(),
                path: path.to_string(),
            }
        }
        Ok(output) => GhidraValidationResult {
            valid: false,
            message: format!("Ghidra Headless exited with status {}", output.status),
            path: path.to_string(),
        },
        Err(error) => GhidraValidationResult {
            valid: false,
            message: error.to_string(),
            path: path.to_string(),
        },
    }
}

pub fn run_ghidra_headless(
    analyze_headless: &Path,
    sample_path: &Path,
    sample_id: &str,
    project_root: &Path,
    scripts_dir: &Path,
    artifact_dir: &Path,
    timeout: Duration,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<GhidraRunResult, String> {
    fs::create_dir_all(project_root).map_err(|error| error.to_string())?;
    fs::create_dir_all(artifact_dir).map_err(|error| error.to_string())?;

    let project_name = format!("threat-{sample_id}");
    let mut logs = Vec::new();
    let script_args = artifact_dir.display().to_string();
    let mut child = Command::new(analyze_headless)
        .arg(project_root)
        .arg(&project_name)
        .arg("-import")
        .arg(sample_path)
        .arg("-overwrite")
        .arg("-scriptPath")
        .arg(scripts_dir)
        .arg("-postScript")
        .arg("ExportFunctions.java")
        .arg(&script_args)
        .arg("-postScript")
        .arg("ExportImports.java")
        .arg(&script_args)
        .arg("-postScript")
        .arg("ExportStrings.java")
        .arg(&script_args)
        .arg("-postScript")
        .arg("ExportDecompiler.java")
        .arg(&script_args)
        .arg("-postScript")
        .arg("ExportCallGraph.java")
        .arg(&script_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;

    let started = Instant::now();
    let status = loop {
        if is_cancelled() {
            let _ = child.kill();
            let output = child
                .wait_with_output()
                .map_err(|error| error.to_string())?;
            logs.push(String::from_utf8_lossy(&output.stdout).to_string());
            logs.push(String::from_utf8_lossy(&output.stderr).to_string());
            return Err("Analysis cancelled".to_string());
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            return Err(format!(
                "Ghidra Headless exceeded the {} second timeout",
                timeout.as_secs()
            ));
        }

        match child.try_wait().map_err(|error| error.to_string())? {
            Some(status) => break status,
            None => std::thread::sleep(Duration::from_millis(250)),
        }
    };

    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;

    logs.push(String::from_utf8_lossy(&output.stdout).to_string());
    logs.push(String::from_utf8_lossy(&output.stderr).to_string());

    if !status.success() {
        return Err(format!("Ghidra Headless failed with status {status}"));
    }

    Ok(GhidraRunResult {
        artifacts: load_ghidra_artifacts(artifact_dir)?,
        logs,
    })
}

pub fn load_ghidra_artifacts(artifact_dir: &Path) -> Result<ThreatArtifacts, String> {
    let functions =
        read_json::<Vec<GhidraFunction>>(artifact_dir.join("functions.json"))?.unwrap_or_default();
    let decompiled =
        read_json::<Vec<GhidraDecompiledFunction>>(artifact_dir.join("decompiled.json"))?
            .unwrap_or_default();
    let call_graph = read_json::<GhidraCallGraph>(artifact_dir.join("callgraph.json"))?;

    Ok(ThreatArtifacts {
        functions,
        decompiled,
        call_graph,
        ..ThreatArtifacts::default()
    })
}

fn read_json<T: serde::de::DeserializeOwned>(path: PathBuf) -> Result<Option<T>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content)
        .map(Some)
        .map_err(|error| format!("Failed to parse {}: {error}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_ghidra_path_is_invalid() {
        let result = validate_ghidra_headless_path("/definitely/not/analyzeHeadless");
        assert!(!result.valid);
    }
}
