use hudsucker::certificate_authority::RcgenAuthority;
use rcgen::{
    BasicConstraints, CertificateParams, CertifiedIssuer, IsCa, Issuer, KeyPair, KeyUsagePurpose,
};
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

static CA_ROOT: OnceLock<PathBuf> = OnceLock::new();

pub fn init_ca_dir(app_data_dir: PathBuf) {
    CA_ROOT.get_or_init(|| app_data_dir.join(".0xbuffer"));
}

#[derive(Debug)]
pub struct CaCerts {
    pub cert_pem: String,
    pub key_pem: String,
}

fn get_ca_dir() -> PathBuf {
    CA_ROOT.get().cloned().unwrap_or_else(|| {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(".0xbuffer")
    })
}

fn get_ca_cert_path() -> PathBuf {
    get_ca_dir().join("ca.pem")
}

fn get_ca_key_path() -> PathBuf {
    get_ca_dir().join("ca-key.pem")
}

pub fn get_ca_certs() -> &'static CaCerts {
    static CA_CERTS: OnceLock<CaCerts> = OnceLock::new();
    CA_CERTS.get_or_init(|| load_or_generate_ca().expect("Failed to load or generate CA"))
}

fn load_or_generate_ca() -> Result<CaCerts, Box<dyn std::error::Error>> {
    let cert_path = get_ca_cert_path();
    let key_path = get_ca_key_path();

    if cert_path.exists() && key_path.exists() {
        println!(
            "[https/cert] Loading existing CA from {} and {}",
            cert_path.display(),
            key_path.display()
        );
        let cert_pem = fs::read_to_string(&cert_path)?;
        let key_pem = fs::read_to_string(&key_path)?;

        println!("[https/cert] CA loaded successfully");
        return Ok(CaCerts { cert_pem, key_pem });
    }

    println!(
        "[https/cert] CA not found, generating new CA at {} and {}",
        cert_path.display(),
        key_path.display()
    );
    fs::create_dir_all(get_ca_dir())?;
    generate_ca(&cert_path, &key_path)
}

fn generate_ca(
    cert_path: &PathBuf,
    key_path: &PathBuf,
) -> Result<CaCerts, Box<dyn std::error::Error>> {
    fs::create_dir_all(get_ca_dir())?;

    let mut params = CertificateParams::default();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
    params
        .distinguished_name
        .push(rcgen::DnType::OrganizationName, "0xbuffer");
    params
        .distinguished_name
        .push(rcgen::DnType::CommonName, "0xbuffer Security Tools Root CA");

    let key_pair = KeyPair::generate()?;
    let key_pem = key_pair.serialize_pem();
    let ca_cert = CertifiedIssuer::self_signed(params, key_pair)?;

    let cert_pem = ca_cert.pem();

    fs::write(cert_path, &cert_pem)?;
    fs::write(key_path, &key_pem)?;

    Ok(CaCerts { cert_pem, key_pem })
}

pub fn export_ca_cert_pem() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let ca = get_ca_certs();
    Ok(ca.cert_pem.as_bytes().to_vec())
}

pub fn get_ca_cert_pem() -> Result<String, Box<dyn std::error::Error>> {
    let ca = get_ca_certs();
    Ok(ca.cert_pem.clone())
}

pub fn create_hudsucker_authority() -> Result<RcgenAuthority, Box<dyn std::error::Error>> {
    let ca_cert_pem = fs::read_to_string(get_ca_cert_path())?;
    let ca_key_pem = fs::read_to_string(get_ca_key_path())?;

    let ca_key_pair = KeyPair::from_pem(&ca_key_pem)?;
    let issuer = Issuer::from_ca_cert_pem(&ca_cert_pem, ca_key_pair)?;

    Ok(RcgenAuthority::new(
        issuer,
        1000,
        hudsucker::rustls::crypto::aws_lc_rs::default_provider(),
    ))
}

pub fn regenerate_ca() -> Result<(), Box<dyn std::error::Error>> {
    let cert_path = get_ca_cert_path();
    let key_path = get_ca_key_path();

    fs::remove_file(&cert_path).ok();
    fs::remove_file(&key_path).ok();

    let _ca = generate_ca(&cert_path, &key_path)?;
    Ok(())
}

pub fn ensure_ca_exists() {
    let cert_path = get_ca_cert_path();
    let key_path = get_ca_key_path();

    if !cert_path.exists() || !key_path.exists() {
        eprintln!("[https/cert] CA files missing, regenerating...");
        if let Err(e) = regenerate_ca() {
            eprintln!("[https/cert] Failed to regenerate CA: {}", e);
        } else {
            eprintln!("[https/cert] CA regenerated successfully");
        }
    }
}
