// ponytail: simplified from https/ subfolder with mod.rs and cert.rs into a single file

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use hexbuffer_proxy::ca::CertificationAuthority;

static CA_ROOT: OnceLock<PathBuf> = OnceLock::new();

pub fn init_ca_dir(app_data_dir: PathBuf) {
    CA_ROOT.get_or_init(|| app_data_dir.join(".hexbuffer"));
}

fn get_ca_dir() -> PathBuf {
    CA_ROOT.get().cloned().unwrap_or_else(|| {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(".hexbuffer")
    })
}

fn get_ca_cert_path() -> PathBuf {
    get_ca_dir().join("ca.pem")
}

fn get_ca_key_path() -> PathBuf {
    get_ca_dir().join("ca-key.pem")
}

fn sync_ca_files(ca: &CertificationAuthority) -> Result<(), Box<dyn std::error::Error>> {
    let dir = get_ca_dir();
    fs::create_dir_all(&dir)?;
    ca.save_ca_to_pem(
        get_ca_cert_path()
            .to_str()
            .ok_or("invalid cert path")?,
    )?;
    ca.save_key_to_pem(
        get_ca_key_path()
            .to_str()
            .ok_or("invalid key path")?,
    )?;
    Ok(())
}

pub fn create_proxy_authority(
) -> Result<CertificationAuthority, Box<dyn std::error::Error>> {
    let ca_dir = get_ca_dir();
    let cert_dir = std::path::Path::new("cert");
    fs::create_dir_all(&ca_dir)?;
    fs::create_dir_all(cert_dir)?;

    let target_key = cert_dir.join("ca-key.pem");
    let target_cert = cert_dir.join("ca.pem");
    let src_key = get_ca_key_path();
    let src_cert = get_ca_cert_path();

    if src_key.exists() && !target_key.exists() {
        fs::copy(&src_key, &target_key).ok();
    }
    if src_cert.exists() && !target_cert.exists() {
        fs::copy(&src_cert, &target_cert).ok();
    }

    let ca = CertificationAuthority::new();
    sync_ca_files(&ca)?;
    Ok(ca)
}

pub fn export_ca_cert_pem() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    Ok(fs::read(get_ca_cert_path())?)
}

pub fn get_ca_cert_pem() -> Result<String, Box<dyn std::error::Error>> {
    Ok(fs::read_to_string(get_ca_cert_path())?)
}

pub fn regenerate_ca() -> Result<(), Box<dyn std::error::Error>> {
    fs::remove_file(get_ca_cert_path()).ok();
    fs::remove_file(get_ca_key_path()).ok();
    fs::remove_file("cert/ca.pem").ok();
    fs::remove_file("cert/ca-key.pem").ok();

    let ca = CertificationAuthority::new();
    sync_ca_files(&ca)?;

    Ok(())
}

pub fn ensure_ca_exists() {
    let cert_path = get_ca_cert_path();
    let key_path = get_ca_key_path();

    if !cert_path.exists() || !key_path.exists() {
        eprintln!("[ca] CA files missing, regenerating...");
        if let Err(e) = regenerate_ca() {
            eprintln!("[ca] Failed to regenerate CA: {}", e);
        } else {
            eprintln!("[ca] CA regenerated successfully");
        }
    }
}
