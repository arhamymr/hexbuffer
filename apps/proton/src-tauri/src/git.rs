use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "untracked", "modified", "added", "deleted", "renamed"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusResult {
    pub is_repo: bool,
    pub branch: String,
    pub files: Vec<GitFileStatus>,
}

fn run_git_cmd(repo_path: &str, args: &[&str]) -> Result<std::process::Output, String> {
    Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))
}

#[tauri::command]
pub fn git_init(repo_path: String) -> Result<(), String> {
    let output = run_git_cmd(&repo_path, &["init"])?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn git_status(repo_path: String) -> Result<GitStatusResult, String> {
    // Check if repository
    let rev_parse = run_git_cmd(&repo_path, &["rev-parse", "--is-inside-work-tree"]);
    match rev_parse {
        Ok(out) if out.status.success() => {}
        _ => {
            return Ok(GitStatusResult {
                is_repo: false,
                branch: String::new(),
                files: vec![],
            });
        }
    }

    // Get current branch
    let branch_out = run_git_cmd(&repo_path, &["branch", "--show-current"])?;
    let branch = String::from_utf8_lossy(&branch_out.stdout).trim().to_string();

    // Get status
    let status_out = run_git_cmd(&repo_path, &["status", "--porcelain"])?;
    let status_str = String::from_utf8_lossy(&status_out.stdout);

    let mut files = Vec::new();

    for line in status_str.lines() {
        if line.len() < 4 {
            continue;
        }

        let x = line.chars().nth(0).unwrap_or(' ');
        let y = line.chars().nth(1).unwrap_or(' ');
        let raw_path = line[3..].trim().to_string();

        // Handle quoted paths (Git quotes paths with special characters)
        let clean_path = if raw_path.starts_with('"') && raw_path.ends_with('"') {
            raw_path[1..raw_path.len() - 1].to_string()
        } else {
            raw_path
        };

        // Determine if rename
        let is_rename = x == 'R' || y == 'R';
        let (actual_path, display_status) = if is_rename && clean_path.contains(" -> ") {
            let parts: Vec<&str> = clean_path.split(" -> ").collect();
            if parts.len() >= 2 {
                (parts[1].to_string(), "renamed")
            } else {
                (clean_path, "renamed")
            }
        } else {
            let status = match if x != ' ' && x != '?' { x } else { y } {
                'M' => "modified",
                'A' => "added",
                'D' => "deleted",
                '?' => "untracked",
                _ => "modified",
            };
            (clean_path, status)
        };

        // Staged changes
        if x != ' ' && x != '?' {
            files.push(GitFileStatus {
                path: actual_path.clone(),
                status: display_status.to_string(),
                staged: true,
            });
        }

        // Unstaged changes
        if y != ' ' {
            files.push(GitFileStatus {
                path: actual_path,
                status: if y == '?' { "untracked".to_string() } else { display_status.to_string() },
                staged: false,
            });
        }
    }

    Ok(GitStatusResult {
        is_repo: true,
        branch,
        files,
    })
}

#[tauri::command]
pub fn git_stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let output = run_git_cmd(&repo_path, &["add", &file_path])?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn git_unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let output = run_git_cmd(&repo_path, &["restore", "--staged", &file_path])?;
    if output.status.success() {
        Ok(())
    } else {
        let output2 = run_git_cmd(&repo_path, &["reset", "HEAD", &file_path])?;
        if output2.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&output2.stderr).trim().to_string())
        }
    }
}

#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<(), String> {
    let output = run_git_cmd(&repo_path, &["commit", "-m", &message])?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn git_get_branches(repo_path: String) -> Result<Vec<String>, String> {
    let output = run_git_cmd(&repo_path, &["branch", "--format=%(refname:short)"])?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let branches = stdout
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        Ok(branches)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn git_switch_branch(repo_path: String, branch: String) -> Result<(), String> {
    let output = run_git_cmd(&repo_path, &["checkout", &branch])?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn git_create_branch(repo_path: String, branch: String) -> Result<(), String> {
    let output = run_git_cmd(&repo_path, &["checkout", "-b", &branch])?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn git_get_original_content(repo_path: String, file_path: String) -> Result<String, String> {
    let output = run_git_cmd(&repo_path, &["show", &format!("HEAD:{}", file_path)])?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn git_pull(repo_path: String) -> Result<String, String> {
    let output = run_git_cmd(&repo_path, &["pull"])?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    if output.status.success() {
        Ok(format!("{}\n{}", stdout, stderr))
    } else {
        Err(format!("{}\n{}", stderr, stdout))
    }
}

#[tauri::command]
pub fn git_push(repo_path: String) -> Result<String, String> {
    let output = run_git_cmd(&repo_path, &["push"])?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(format!("{}\n{}", stdout, stderr))
    } else {
        Err(format!("{}\n{}", stderr, stdout))
    }
}

#[tauri::command]
pub fn git_clone(repo_path: String, url: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(&["clone", &url, "."])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute clone command: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_git_init_and_status() {
        let temp = TempDir::new().unwrap();
        let path = temp.path().to_string_lossy().to_string();

        let res = git_status(path.clone()).unwrap();
        assert!(!res.is_repo);

        git_init(path.clone()).unwrap();
        let res = git_status(path.clone()).unwrap();
        assert!(res.is_repo);
    }
}
