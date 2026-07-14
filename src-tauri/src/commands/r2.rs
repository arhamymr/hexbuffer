use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use keyring::{Entry, Error as KeyringError};

fn log(msg: &str) {
    let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{ts}] {msg}");
    eprintln!("{line}");
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/hexbuffer.log")
        .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{line}\n").as_bytes()));
}

const R2_KEYRING_SERVICE: &str = "hexbuffer.r2";
const R2_KEYRING_USER: &str = "default_secret";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct R2Settings {
    pub account_id: String,
    pub access_key_id: String,
    pub custom_endpoint_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct R2SettingsWithSecret {
    pub account_id: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub custom_endpoint_url: Option<String>,
}

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(R2_KEYRING_SERVICE, R2_KEYRING_USER).map_err(|e| e.to_string())
}

fn r2_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(app_dir.join("r2-settings.json"))
}

#[tauri::command]
pub async fn get_r2_settings(app: AppHandle) -> Result<Option<R2SettingsWithSecret>, String> {
    let path = r2_settings_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let settings: R2Settings = serde_json::from_str(&content).map_err(|error| error.to_string())?;

    // Look up secret key in Keychain
    let secret_access_key = match keyring_entry()?.get_password() {
        Ok(pw) => pw,
        Err(KeyringError::NoEntry) => "".to_string(),
        Err(error) => return Err(format!("OS Keychain error: {}", error)),
    };

    Ok(Some(R2SettingsWithSecret {
        account_id: settings.account_id,
        access_key_id: settings.access_key_id,
        secret_access_key,
        custom_endpoint_url: settings.custom_endpoint_url,
    }))
}

#[tauri::command]
pub async fn save_r2_credentials(
    app: AppHandle,
    account_id: String,
    access_key_id: String,
    secret_access_key: String,
    custom_endpoint_url: Option<String>,
) -> Result<(), String> {
    let account_id = account_id.trim();
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();

    if account_id.is_empty() || access_key_id.is_empty() || secret_access_key.is_empty() {
        return Err("Account ID, Access Key ID, and Secret Access Key must not be empty".to_string());
    }

    // Save Secret Key to OS Keychain
    keyring_entry()?
        .set_password(secret_access_key)
        .map_err(|e| format!("Failed to save secret in OS Keychain: {}", e))?;

    // Save metadata to cleartext JSON config file
    let settings = R2Settings {
        account_id: account_id.to_string(),
        access_key_id: access_key_id.to_string(),
        custom_endpoint_url: if let Some(ref url) = custom_endpoint_url {
            let trimmed = url.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        } else {
            None
        },
    };

    let path = r2_settings_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let content = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn clear_r2_credentials(app: AppHandle) -> Result<(), String> {
    // Delete config file
    let path = r2_settings_path(&app)?;
    if path.exists() {
        let _ = fs::remove_file(path);
    }

    // Delete password from OS Keychain
    match keyring_entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => {}
        Err(error) => return Err(format!("Failed to delete from OS Keychain: {}", error)),
    }

    Ok(())
}

#[derive(serde::Serialize)]
pub struct R2HttpResponse {
    pub status: u16,
    pub headers: std::collections::HashMap<String, String>,
    pub body: Vec<u8>,
}

#[tauri::command]
pub async fn r2_http_request(
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: Option<Vec<u8>>,
) -> Result<R2HttpResponse, String> {
    log(&format!("[r2_http_request] Method: {}, URL: {}", method, url));
    let client = reqwest::Client::new();
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| {
            let err = e.to_string();
            log(&format!("[r2_http_request] Method parsing error: {}", err));
            err
        })?;

    let mut req = client.request(method, &url);
    for (k, v) in headers {
        if k.to_lowercase() == "host" {
            continue;
        }
        req = req.header(k, v);
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let res = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            let err = e.to_string();
            log(&format!("[r2_http_request] Network request failed: {}", err));
            return Err(err);
        }
    };

    let status = res.status().as_u16();
    let mut res_headers = std::collections::HashMap::new();
    for (k, v) in res.headers() {
        if let Ok(val_str) = v.to_str() {
            res_headers.insert(k.to_string(), val_str.to_string());
        }
    }

    let body_bytes = match res.bytes().await {
        Ok(b) => b.to_vec(),
        Err(e) => {
            let err = e.to_string();
            log(&format!("[r2_http_request] Reading body failed: {}", err));
            return Err(err);
        }
    };

    log(&format!(
        "[r2_http_request] Status: {}, Body size: {} bytes",
        status,
        body_bytes.len()
    ));

    // If status >= 400, print first 200 chars of body for error diagnosis
    if status >= 400 {
        if let Ok(body_str) = String::from_utf8(body_bytes.clone()) {
            let truncated = if body_str.len() > 300 { &body_str[..300] } else { &body_str };
            log(&format!("[r2_http_request] Error Body: {}", truncated));
        }
    }

    Ok(R2HttpResponse {
        status,
        headers: res_headers,
        body: body_bytes,
    })
}

