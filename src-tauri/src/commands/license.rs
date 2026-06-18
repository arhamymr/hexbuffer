use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const LICENSE_SERVER_URL: &str = "https://0xbuffer.com";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseInfo {
    pub key: String,
    pub plan: String,
    pub activated_at: String,
}

#[derive(Debug, Serialize)]
struct ActivateRequest {
    #[serde(rename = "licenseKey")]
    license_key: String,
    #[serde(rename = "machineFingerprint")]
    machine_fingerprint: String,
    #[serde(rename = "machineInfo")]
    machine_info: MachineInfo,
}

#[derive(Debug, Serialize)]
struct VerifyRequest {
    #[serde(rename = "licenseKey")]
    license_key: String,
    #[serde(rename = "machineFingerprint")]
    machine_fingerprint: String,
}

#[derive(Debug, Serialize)]
struct DeactivateRequest {
    #[serde(rename = "licenseKey")]
    license_key: String,
    #[serde(rename = "machineFingerprint")]
    machine_fingerprint: String,
}

#[derive(Debug, Serialize, Clone)]
struct MachineInfo {
    os: String,
    hostname: String,
}

fn get_machine_fingerprint() -> String {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    let os = std::env::consts::OS.to_string();
    let raw = format!("{}:{}", os, hostname);
    let hash = Sha256::digest(raw.as_bytes());
    format!("{:x}", hash)
}

fn get_machine_info() -> MachineInfo {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    let os = std::env::consts::OS.to_string();
    MachineInfo { os, hostname }
}

#[tauri::command]
pub async fn activate_license(key: String) -> Result<LicenseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let body = ActivateRequest {
        license_key: key,
        machine_fingerprint: get_machine_fingerprint(),
        machine_info: get_machine_info(),
    };

    let url = format!("{}/api/v1/license/activate", LICENSE_SERVER_URL);
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to reach license server: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "License activation failed ({}): {}",
            status,
            if error_body.is_empty() {
                "Unknown error".to_string()
            } else {
                error_body
            }
        ));
    }

    resp.json::<LicenseInfo>()
        .await
        .map_err(|e| format!("Failed to parse license response: {}", e))
}

#[tauri::command]
pub async fn verify_license(key: String) -> Result<LicenseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let body = VerifyRequest {
        license_key: key,
        machine_fingerprint: get_machine_fingerprint(),
    };

    let url = format!("{}/api/v1/license/verify", LICENSE_SERVER_URL);
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to reach license server: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "License verification failed ({}): {}",
            status,
            if error_body.is_empty() {
                "Unknown error".to_string()
            } else {
                error_body
            }
        ));
    }

    resp.json::<LicenseInfo>()
        .await
        .map_err(|e| format!("Failed to parse license response: {}", e))
}

#[tauri::command]
pub async fn deactivate_license(key: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let body = DeactivateRequest {
        license_key: key,
        machine_fingerprint: get_machine_fingerprint(),
    };

    let url = format!("{}/api/v1/license/deactivate", LICENSE_SERVER_URL);
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to reach license server: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "License deactivation failed ({}): {}",
            status,
            if error_body.is_empty() {
                "Unknown error".to_string()
            } else {
                error_body
            }
        ));
    }

    Ok(())
}
