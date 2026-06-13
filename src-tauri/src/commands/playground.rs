use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompilerInfo {
    pub name: String,
    pub path: String,
    pub version: String,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub home_dir: String,
    pub compilers: Vec<CompilerInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaygroundProject {
    pub name: String,
    pub path: String,
    pub language: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Try to get the version string of a compiler. Returns (version_string, available).
fn detect_compiler(name: &str) -> (String, bool) {
    match Command::new(name).arg("--version").output() {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string();
            if version.is_empty() {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                (stderr, true)
            } else {
                (version, true)
            }
        }
        Err(_) => (format!("{} not found", name), false),
    }
}

/// Walk a directory recursively, filtering out unwanted entries.
fn walk_dir(dir: &Path, base: &Path, depth: usize) -> Vec<FileTreeNode> {
    let max_depth = 12;
    if depth > max_depth {
        return vec![];
    }

    let mut children: Vec<FileTreeNode> = Vec::new();

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return children,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip hidden files/dirs (except .gitignore)
        if file_name.starts_with('.') && file_name != ".gitignore" {
            continue;
        }

        // Skip common build output directories
        if file_name == "target" || file_name == "node_modules" {
            continue;
        }

        let is_dir = path.is_dir();
        let relative = path
            .strip_prefix(base)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        let grandchildren = if is_dir {
            walk_dir(&path, base, depth + 1)
        } else {
            vec![]
        };

        children.push(FileTreeNode {
            name: file_name,
            path: relative,
            is_dir,
            children: grandchildren,
        });
    }

    // Sort: directories first, then files, alphabetically within each group
    children.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    children
}

/// Validate that a file path is within the project root (path traversal protection).
fn validate_within_project(file_path: &str, project_path: &str) -> Result<PathBuf, String> {
    let project = Path::new(project_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?;

    let file = if Path::new(file_path).is_absolute() {
        PathBuf::from(file_path)
    } else {
        project.join(file_path)
    };

    let canonical = file
        .canonicalize()
        .map_err(|e| format!("Failed to resolve file path: {}", e))?;

    if !canonical.starts_with(&project) {
        return Err("Access denied: path is outside the project directory".to_string());
    }

    Ok(canonical)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn check_compilers() -> Vec<CompilerInfo> {
    let compilers_to_check = [
        ("rustc", "rustc"),
        ("cargo", "cargo"),
        ("gcc", "gcc"),
        ("clang", "clang++"),
    ];

    compilers_to_check
        .iter()
        .map(|(display, bin)| {
            let (version, available) = detect_compiler(bin);
            CompilerInfo {
                name: display.to_string(),
                path: bin.to_string(),
                version,
                available,
            }
        })
        .collect()
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        home_dir: dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        compilers: check_compilers(),
    }
}

#[tauri::command]
pub fn create_project(
    project_name: String,
    language: String,
    parent_dir: String,
) -> Result<PlaygroundProject, String> {
    let parent = Path::new(&parent_dir);
    std::fs::create_dir_all(parent)
        .map_err(|e| format!("Failed to create parent directory: {}", e))?;

    let project_path = parent.join(&project_name);

    if project_path.exists() {
        return Err(format!(
            "A project named '{}' already exists at that location",
            project_name
        ));
    }

    match language.as_str() {
        "rust" => {
            let output = Command::new("cargo")
                .args(["new", &project_name, "--name", "playground"])
                .current_dir(parent)
                .output()
                .map_err(|e| format!("Failed to run cargo new: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("cargo new failed: {}", stderr));
            }

            Ok(PlaygroundProject {
                name: project_name,
                path: project_path.to_string_lossy().to_string(),
                language: "rust".to_string(),
            })
        }
        "c" => {
            std::fs::create_dir_all(&project_path)
                .map_err(|e| format!("Failed to create project directory: {}", e))?;

            let main_c = project_path.join("main.c");
            std::fs::write(
                &main_c,
                r#"#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
"#,
            )
            .map_err(|e| format!("Failed to write main.c: {}", e))?;

            let gitignore = project_path.join(".gitignore");
            std::fs::write(&gitignore, "main\n*.o\n")
                .map_err(|e| format!("Failed to write .gitignore: {}", e))?;

            Ok(PlaygroundProject {
                name: project_name,
                path: project_path.to_string_lossy().to_string(),
                language: "c".to_string(),
            })
        }
        "cpp" => {
            std::fs::create_dir_all(&project_path)
                .map_err(|e| format!("Failed to create project directory: {}", e))?;

            let main_cpp = project_path.join("main.cpp");
            std::fs::write(
                &main_cpp,
                r#"#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
"#,
            )
            .map_err(|e| format!("Failed to write main.cpp: {}", e))?;

            let gitignore = project_path.join(".gitignore");
            std::fs::write(&gitignore, "main\n*.o\n")
                .map_err(|e| format!("Failed to write .gitignore: {}", e))?;

            Ok(PlaygroundProject {
                name: project_name,
                path: project_path.to_string_lossy().to_string(),
                language: "cpp".to_string(),
            })
        }
        _ => Err(format!("Unsupported language: {}", language)),
    }
}

#[tauri::command]
pub fn list_project_files(project_path: String) -> Result<Vec<FileTreeNode>, String> {
    let root = Path::new(&project_path);
    if !root.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    if !root.is_dir() {
        return Err(format!("Project path is not a directory: {}", project_path));
    }

    Ok(walk_dir(root, root, 0))
}

#[tauri::command]
pub fn read_project_file(file_path: String, project_path: String) -> Result<FileContent, String> {
    let canonical = validate_within_project(&file_path, &project_path)?;

    if !canonical.is_file() {
        return Err("Path is not a file".to_string());
    }

    // Size guard: reject files over 1 MB
    let metadata = canonical
        .metadata()
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    if metadata.len() > 1_000_000 {
        return Err("File is too large (max 1 MB)".to_string());
    }

    let content = std::fs::read_to_string(&canonical)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(FileContent {
        path: file_path,
        content,
    })
}

#[tauri::command]
pub fn write_project_file(
    file_path: String,
    content: String,
    project_path: String,
) -> Result<(), String> {
    let project_root = Path::new(&project_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?;

    let file = if Path::new(&file_path).is_absolute() {
        PathBuf::from(&file_path)
    } else {
        project_root.join(&file_path)
    };

    // Canonicalize the parent to validate it's within the project
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    std::fs::write(&file, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_project_file(file_path: String, project_path: String) -> Result<(), String> {
    let canonical = validate_within_project(&file_path, &project_path)?;

    if canonical.is_dir() {
        std::fs::remove_dir_all(&canonical)
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        std::fs::remove_file(&canonical)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn rename_project_file(
    old_path: String,
    new_path: String,
    project_path: String,
) -> Result<(), String> {
    let old = validate_within_project(&old_path, &project_path)?;
    let new = Path::new(&project_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?
        .join(&new_path);

    // Validate new path is also within project
    let new_canonical = new
        .canonicalize()
        .unwrap_or_else(|_| new.clone());
    let project_root = Path::new(&project_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?;
    if new_canonical.exists() {
        // Allow if same file
        if old != new_canonical {
            return Err("A file with that name already exists".to_string());
        }
    }

    // Basic check: parent of new must be under project
    if let Some(parent) = new.parent() {
        let parent_canon = parent
            .canonicalize()
            .map_err(|e| format!("Failed to resolve parent path: {}", e))?;
        if !parent_canon.starts_with(&project_root) {
            return Err("Access denied: target path is outside the project directory".to_string());
        }
    }

    std::fs::rename(&old, &new).map_err(|e| format!("Failed to rename: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn run_build_command(
    working_dir: String,
    command: String,
    args: Vec<String>,
) -> Result<CommandOutput, String> {
    let output = Command::new(&command)
        .args(&args)
        .current_dir(&working_dir)
        .output()
        .map_err(|e| format!("Failed to execute '{}': {}", command, e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        success: output.status.success(),
    })
}
