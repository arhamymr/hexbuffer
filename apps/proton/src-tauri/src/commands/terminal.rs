use serde::Serialize;

#[derive(Serialize)]
pub struct ShellInfo {
    pub path: String,
    pub args: Vec<String>,
}

#[tauri::command]
pub fn get_default_shell() -> Result<ShellInfo, String> {
    #[cfg(target_os = "windows")]
    {
        let comspec = std::env::var("COMSPEC")
            .unwrap_or_else(|_| "C:\\Windows\\System32\\cmd.exe".to_string());
        return Ok(ShellInfo {
            path: comspec,
            args: vec![],
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let shell_env = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let shell_name = std::path::Path::new(&shell_env)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("sh");

        let args = match shell_name {
            "bash" => vec!["-i".to_string()],
            "zsh" => vec!["-i".to_string()],
            "fish" => vec!["-i".to_string()],
            _ => vec![],
        };

        Ok(ShellInfo {
            path: shell_env,
            args,
        })
    }
}

#[tauri::command]
pub fn get_home_directory() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}
