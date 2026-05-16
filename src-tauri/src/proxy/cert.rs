use rcgen::{CertificateParams, KeyPair, KeyUsagePurpose, SanType, IsCa, BasicConstraints, CertifiedIssuer};
use rcgen::string::Ia5String;
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use pingora::tls::x509::X509;
use pingora::tls::pkey::PKey;

#[derive(Debug)]
pub struct CaCerts {
    pub cert: X509,
    pub key: PKey<pingora::tls::pkey::Private>,
}

fn get_ca_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".apprecon"))
        .unwrap_or_else(|| PathBuf::from(".apprecon"))
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
        let cert_pem = fs::read(&cert_path)?;
        let key_pem = fs::read(&key_path)?;

        let cert = X509::from_pem(&cert_pem)?;
        let key = PKey::private_key_from_pem(&key_pem)?;

        return Ok(CaCerts { cert, key });
    }

    fs::create_dir_all(get_ca_dir())?;
    generate_ca(&cert_path, &key_path)
}

fn generate_ca(cert_path: &PathBuf, key_path: &PathBuf) -> Result<CaCerts, Box<dyn std::error::Error>> {
    let mut params = CertificateParams::default();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
    params.distinguished_name.push(rcgen::DnType::OrganizationName, "Apprecon");
    params.distinguished_name.push(rcgen::DnType::CommonName, "Apprecon Root CA");

    let key_pair = KeyPair::generate()?;
    let key_pem_str = key_pair.serialize_pem();
    let ca_cert = CertifiedIssuer::self_signed(params, key_pair)?;

    let cert_pem = ca_cert.pem();

    fs::write(cert_path, cert_pem.as_bytes())?;
    fs::write(key_path, key_pem_str.as_bytes())?;

    let cert = X509::from_pem(cert_pem.as_bytes())?;
    let key = PKey::private_key_from_pem(key_pem_str.as_bytes())?;

    Ok(CaCerts { cert, key })
}

pub fn generate_host_cert(
    host: &str,
) -> Result<(X509, PKey<pingora::tls::pkey::Private>), Box<dyn std::error::Error>> {
    let ca_key_pem = fs::read_to_string(get_ca_key_path())?;
    let ca_key_pair = KeyPair::from_pem(ca_key_pem.as_str())?;

    let host_key_pair = KeyPair::generate()?;

    let mut params = CertificateParams::default();
    params.distinguished_name.push(rcgen::DnType::CommonName, host);
    params.subject_alt_names = vec![SanType::DnsName(Ia5String::try_from(host)?)];

    let ca_cert_params = {
        let mut p = CertificateParams::default();
        p.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        p.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
        p.distinguished_name.push(rcgen::DnType::OrganizationName, "Apprecon");
        p.distinguished_name.push(rcgen::DnType::CommonName, "Apprecon Root CA");
        p
    };
    let ca_issuer = CertifiedIssuer::self_signed(ca_cert_params, ca_key_pair)?;

    let cert = CertifiedIssuer::signed_by(params, host_key_pair, &ca_issuer)?;

    let cert_pem = cert.pem();
    let key_pem_str = cert.key().serialize_pem();

    let x509_cert = X509::from_pem(cert_pem.as_bytes())?;
    let pkey = PKey::private_key_from_pem(key_pem_str.as_bytes())?;

    Ok((x509_cert, pkey))
}

pub fn export_ca_cert_pem() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let ca = get_ca_certs();
    let pem = ca.cert.to_pem()?;
    Ok(pem)
}