# Fix: "Is a directory (os error 21)" When Importing macOS `.app` Bundles

## Context

The Threats page's import functionality fails when a user selects a macOS `.app` bundle because `.app` bundles are **directories**, not regular files. The Rust backend's `import_sample` calls `fs::read(source_path)` ([mod.rs:24](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/threats/mod.rs#L24)), which only works on files — producing `"Is a directory (os error 21)"`.

The fix: detect directories in `import_sample`, create a compressed tar.gz archive of the directory, and during analysis extract the archive to find the main executable binary for static analysis + Ghidra.

## Files Modified

| File | What Changes |
|---|---|
| `src-tauri/Cargo.toml` | Add `tar = "0.4"` dependency |
| `src-tauri/src/threats/mod.rs` | Add helpers + modify `import_sample` + modify `run_analysis_inner` |

## Task 1: Add `tar` crate dependency

**File:** `src-tauri/Cargo.toml`

Add after `flate2 = "1.0"` (line 50):
```toml
tar = "0.4"
```

## Task 2: Add helper functions and modify `import_sample`

**File:** `src-tauri/src/threats/mod.rs`

### 2a: Add `use` imports (replace lines 5-7)

Add `std::io::Write`:
```rust
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
```

### 2b: Replace `import_sample` (lines 19-53)

New logic:
1. Check `source_path.is_dir()`
2. If directory → create in-memory tar.gz using `tar::Builder` + `flate2::GzEncoder`, store as `sample.tar.gz`
3. If file → existing behavior (read + store as `sample`)
4. The stored_path now points to `sample.tar.gz` for directories

```rust
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
        // Create tar.gz archive of the directory in memory
        let tar_bytes = {
            let mut archive = tar::Builder::new(Vec::new());
            archive
                .follow_symlinks(false)
                .append_dir_all(".", source_path)
                .map_err(|e| format!("Failed to build tar archive: {e}"))?;
            archive
                .into_inner()
                .map_err(|e| format!("Failed to finalize tar archive: {e}"))?
        };
        let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        gz.write_all(&tar_bytes)
            .map_err(|e| format!("Failed to compress archive: {e}"))?;
        let archive_bytes = gz
            .finish()
            .map_err(|e| format!("Failed to finalize gzip: {e}"))?;

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
```

## Task 3: Modify `run_analysis_inner` to handle archives during analysis

**File:** `src-tauri/src/threats/mod.rs` — lines 175-177

Replace the "Reading imported sample" block (lines 175-177) and the Ghidra call path (line 227) to:
1. Detect if stored sample is a `.tar.gz` archive
2. If archive → extract to a temp `contents/` dir, find the main Mach-O/ELF/PE binary inside
3. Use that binary's bytes for static analysis and its path for Ghidra
4. If plain file → existing behavior

### 3a: Add helper functions after `import_sample` (before `run_analysis`)

```rust
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

fn is_executable_binary(path: &Path) -> bool {
    if let Ok(mut file) = fs::File::open(path) {
        let mut magic = [0u8; 4];
        if file.read_exact(&mut magic).is_err() {
            return false;
        }
        matches!(
            magic,
            [0xfe, 0xed, 0xfa, 0xce]     // Mach-O 32-bit big-endian
                | [0xfe, 0xed, 0xfa, 0xcf] // Mach-O 64-bit big-endian
                | [0xce, 0xfa, 0xed, 0xfe] // Mach-O 32-bit little-endian
                | [0xcf, 0xfa, 0xed, 0xfe] // Mach-O 64-bit little-endian
                | [0xca, 0xfe, 0xba, 0xbe] // Mach-O universal/fat
                | [0xbe, 0xba, 0xfe, 0xca] // Mach-O universal/fat (reverse)
                | [0x7f, b'E', b'L', b'F']  // ELF
                | [b'M', b'Z', _, _]         // PE
        )
    } else {
        false
    }
}

fn find_main_binary(extracted_dir: &Path) -> Result<PathBuf, String> {
    // Priority: macOS .app bundle → Contents/MacOS/*
    for entry in fs::read_dir(extracted_dir).map_err(|e| e.to_string())?.flatten() {
        let macos_dir = entry.path().join("Contents").join("MacOS");
        if macos_dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&macos_dir) {
                for file in entries.flatten() {
                    let p = file.path();
                    if p.is_file() && is_executable_binary(&p) {
                        return Ok(p);
                    }
                }
            }
        }
    }

    // Fallback: walk entire tree for first executable binary
    fn walk(dir: &Path) -> Result<Option<PathBuf>, String> {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
            let p = entry.path();
            if p.is_dir() {
                if let Some(found) = walk(&p)? {
                    return Ok(Some(found));
                }
            } else if p.is_file() && is_executable_binary(&p) {
                return Ok(Some(p));
            }
        }
        Ok(None)
    }

    walk(extracted_dir)?
        .ok_or_else(|| "No executable binary found in the imported directory".to_string())
}
```

Also add `use std::io::Read;` to imports for `read_exact`.

### 3b: Replace lines 175-177 and update Ghidra call

Replace:
```rust
    on_log("Reading imported sample");
    let sample_path = PathBuf::from(&sample.stored_path);
    let bytes = fs::read(&sample_path).map_err(|error| error.to_string())?;
```

With:
```rust
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
        let binary_path = find_main_binary(&contents_dir)?;
        on_log(&format!(
            "Found binary: {}",
            binary_path.file_name().unwrap_or_default().to_string_lossy()
        ));
        let binary_bytes = fs::read(&binary_path).map_err(|error| error.to_string())?;
        (binary_bytes, contents_dir)
    } else {
        let bytes = fs::read(&sample_path).map_err(|error| error.to_string())?;
        (bytes, sample_path)
    };
```

And replace `&sample_path` on the Ghidra call (line 227) with `&ghidra_import_path`:
```rust
        let ghidra_result = run_ghidra_headless(
            Path::new(&ghidra_path),
            &ghidra_import_path,
            ...
```

## Storage Layout After Changes

**File import** (`/path/to/malware.bin` — unchanged):
```
threats/samples/<uuid>/
  sample            # raw bytes
```

**Directory import** (`/Applications/MyApp.app`):
```
threats/samples/<uuid>/
  sample.tar.gz     # compressed archive (what stored_path points to)
  contents/         # extracted tree (created lazily during first analysis)
    MyApp.app/Contents/MacOS/MyApp
```

## Verification

1. Build: `cd src-tauri && cargo build` — must compile without errors
2. Import a regular file → should work as before (no regression)
3. Import a macOS `.app` bundle → should succeed and show the sample in the list
4. Run analysis on the imported `.app` → should find the main binary, run static analysis + Ghidra
5. Delete sample → should clean up both `sample.tar.gz` and `contents/` dir (delete logic already uses `remove_dir_all` on parent dir, which handles both)
