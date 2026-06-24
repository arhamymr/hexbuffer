use crate::proxy::https::cert::export_ca_cert_pem;

#[tauri::command]
pub async fn save_ca_cert(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_ca_cert() -> Result<String, String> {
    let pem = export_ca_cert_pem().map_err(|error| format!("{error}"))?;
    String::from_utf8(pem).map_err(|e| e.to_string())
}
