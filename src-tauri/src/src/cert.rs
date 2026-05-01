use rcgen::{
   BasicConstraints, Certificate, CertificateParams, DistinguishedName, DnType, IsCa, KeyPair,
   KeyUsagePurpose, SanType,
};
use ring::rand::{SecureRandom, SystemRandom};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

const CERT_VALIDITY_SECS: u64 = 86400;

pub struct CertManager {
    data_dir: PathBuf,
    ca_cert: Arc<Mutex<Option<Arc<Certificate>>>>,
    ca_key_pair: Arc<Mutex<Option<Arc<KeyPair>>>>,
}

impl CertManager {
    pub fn new() -> Self {
        let data_dir = std::env::var("CERT_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                std::env::var("HOME")
                    .map(|h| PathBuf::from(h).join(".bug-bounty-tools").join("data"))
                    .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("data"))
            });

        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).ok();
        }

        let certs_dir = data_dir.join("certs");
        if !certs_dir.exists() {
            fs::create_dir_all(&certs_dir).ok();
        }

        Self {
            data_dir,
            ca_cert: Arc::new(Mutex::new(None)),
            ca_key_pair: Arc::new(Mutex::new(None)),
        }
    }

    pub fn get_or_create_ca_cert(&self) -> Result<(String, String), String> {
        let cert_path = self.data_dir.join("ca_cert.pem");
        let key_path = self.data_dir.join("ca_key.pem");

        if cert_path.exists() && key_path.exists() {
            let cert = fs::read_to_string(&cert_path).map_err(|e| e.to_string())?;
            let key = fs::read_to_string(&key_path).map_err(|e| e.to_string())?;
            return Ok((cert, key));
        }

        self.generate_ca_cert()
    }

    fn ensure_ca_initialized(&self) -> Result<(), String> {
        {
            let cert_guard = self.ca_cert.lock().map_err(|e| e.to_string())?;
            let key_guard = self.ca_key_pair.lock().map_err(|e| e.to_string())?;
            if cert_guard.is_some() && key_guard.is_some() {
                return Ok(());
            }
        }

        let (_, ca_key_pem) = self.get_or_create_ca_cert()?;
        let ca_key_pair = KeyPair::from_pem(&ca_key_pem).map_err(|e| format!("CA key parse error: {:?}", e))?;

        let mut params = CertificateParams::default();
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.key_usages.push(KeyUsagePurpose::KeyCertSign);
        params.key_usages.push(KeyUsagePurpose::CrlSign);
        params.subject_alt_names.push(SanType::DnsName(
            "Bug Bounty Tools".try_into().map_err(|e| format!("{:?}", e))?,
        ));

        let mut dist_name = DistinguishedName::new();
        dist_name.push(DnType::CommonName, "Bug Bounty Tools MITM CA");
        dist_name.push(DnType::OrganizationName, "Bug Bounty Tools");
        dist_name.push(DnType::CountryName, "US");
        params.distinguished_name = dist_name;
        let rng = SystemRandom::new();
        let mut serial = [0u8; 16];
        rng.fill(&mut serial).map_err(|e| format!("RNG error: {:?}", e))?;
        params.serial_number = Some(rcgen::SerialNumber::from(serial.to_vec()));

        let ca_cert = params.self_signed(&ca_key_pair).map_err(|e| format!("CA self-signed error: {:?}", e))?;

        {
            let mut cert_guard = self.ca_cert.lock().map_err(|e| e.to_string())?;
            let mut key_guard = self.ca_key_pair.lock().map_err(|e| e.to_string())?;
            *cert_guard = Some(Arc::new(ca_cert));
            *key_guard = Some(Arc::new(ca_key_pair));
        }

        Ok(())
    }

    pub fn generate_ca_cert(&self) -> Result<(String, String), String> {
        let rng = SystemRandom::new();
        let mut serial = [0u8; 16];
        rng.fill(&mut serial).map_err(|e| format!("RNG error: {:?}", e))?;

        let mut params = CertificateParams::default();
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.key_usages.push(KeyUsagePurpose::KeyCertSign);
        params.key_usages.push(KeyUsagePurpose::CrlSign);
        params.subject_alt_names.push(SanType::DnsName(
            "Bug Bounty Tools".try_into().map_err(|e| format!("{:?}", e))?,
        ));

        let mut dist_name = DistinguishedName::new();
        dist_name.push(DnType::CommonName, "Bug Bounty Tools MITM CA");
        dist_name.push(DnType::OrganizationName, "Bug Bounty Tools");
        dist_name.push(DnType::CountryName, "US");
        params.distinguished_name = dist_name;

        params.serial_number = Some(rcgen::SerialNumber::from(serial.to_vec()));

        let key_pair = KeyPair::generate_for(&rcgen::PKCS_ECDSA_P256_SHA256).map_err(|e| format!("Key gen error: {:?}", e))?;
        let cert = params.self_signed(&key_pair).map_err(|e| format!("Cert error: {:?}", e))?;

        let pem_cert = cert.pem();
        let pem_key = key_pair.serialize_pem();

        fs::write(self.data_dir.join("ca_cert.pem"), &pem_cert).map_err(|e| e.to_string())?;
        fs::write(self.data_dir.join("ca_key.pem"), &pem_key).map_err(|e| e.to_string())?;

        Ok((pem_cert, pem_key))
    }

    pub fn get_ca_cert_pem(&self) -> Result<String, String> {
        let (cert, _) = self.get_or_create_ca_cert()?;
        Ok(cert)
    }

    pub fn get_ca_cert_path(&self) -> PathBuf {
        self.data_dir.join("ca_cert.pem")
    }

    pub fn generate_domain_cert(&self, domain: &str) -> Result<(String, String), String> {
        let domain_hash = sha256_hex(domain);
        let cert_file = self.data_dir.join("certs").join(format!("{}.pem", domain_hash));
        let key_file = self.data_dir.join("certs").join(format!("{}.key", domain_hash));
        let meta_file = self.data_dir.join("certs").join(format!("{}.meta", domain_hash));

        if cert_file.exists() && key_file.exists() {
            match fs::read_to_string(&cert_file) {
                Ok(cert) => match fs::read_to_string(&key_file) {
                    Ok(key) => {
                        if meta_file.exists() {
                            match fs::read_to_string(&meta_file) {
                                Ok(meta) => {
                                    match meta.trim().parse::<u64>() {
                                        Ok(expiry) => {
                                            let now = SystemTime::now()
                                                .duration_since(UNIX_EPOCH)
                                                .map_err(|e| e.to_string())?
                                                .as_secs();
                                            if now < expiry {
                                                log::debug!("Using existing cert for {}", domain);
                                                return Ok((cert, key));
                                            }
                                            log::debug!("Cert expired for {}, regenerating", domain);
                                        }
                                        Err(e) => {
                                            log::warn!("Meta parse failed for {}: {}, using existing cert", domain, e);
                                            return Ok((cert, key));
                                        }
                                    }
                                }
                                Err(e) => {
                                    log::warn!("Meta read failed for {}: {}, using existing cert", domain, e);
                                    return Ok((cert, key));
                                }
                            }
                        } else {
                            log::warn!("Meta file missing for {}, using existing cert", domain);
                            return Ok((cert, key));
                        }
                    }
                    Err(e) => {
                        log::warn!("Key file read failed for {}: {}, will regenerate", domain, e);
                    }
                },
                Err(e) => {
                    log::warn!("Cert file read failed for {}: {}, will regenerate", domain, e);
                }
            }
        }

        self.ensure_ca_initialized()?;

        let ca_cert = {
            let cert_guard = self.ca_cert.lock().map_err(|e| e.to_string())?;
            Arc::clone(cert_guard.as_ref().unwrap())
        };
        let ca_key_pair = {
            let key_guard = self.ca_key_pair.lock().map_err(|e| e.to_string())?;
            Arc::clone(key_guard.as_ref().unwrap())
        };

        let rng = SystemRandom::new();
        let mut serial = [0u8; 16];
        rng.fill(&mut serial).map_err(|e| format!("RNG error: {:?}", e))?;

        let mut params = CertificateParams::default();
        params.is_ca = IsCa::NoCa;
        params.key_usages.push(KeyUsagePurpose::DigitalSignature);
        params.key_usages.push(KeyUsagePurpose::KeyEncipherment);

        let mut san_names = Vec::new();
        san_names.push(SanType::DnsName(domain.try_into().map_err(|e| format!("{:?}", e))?));

        let wildcard = if domain.starts_with("*.") {
            domain.to_string()
        } else {
            format!("*.{}", domain)
        };
        if let Ok(wc) = wildcard.clone().try_into() {
            san_names.push(SanType::DnsName(wc));
        }

        params.subject_alt_names = san_names;

        let mut dist_name = DistinguishedName::new();
        dist_name.push(DnType::CommonName, domain);
        params.distinguished_name = dist_name;

        params.serial_number = Some(rcgen::SerialNumber::from(serial.to_vec()));

        let key_pair = KeyPair::generate_for(&rcgen::PKCS_ECDSA_P256_SHA256).map_err(|e| format!("Key gen error: {:?}", e))?;

        let cert = params.signed_by(&key_pair, &ca_cert, &ca_key_pair)
            .map_err(|e| format!("Domain cert sign error: {:?}", e))?;

        let pem_cert = cert.pem();
        let pem_key = key_pair.serialize_pem();

        fs::write(&cert_file, &pem_cert).map_err(|e| e.to_string())?;
        fs::write(&key_file, &pem_key).map_err(|e| e.to_string())?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs();
        let expiry = now + CERT_VALIDITY_SECS;
        fs::write(&meta_file, expiry.to_string()).map_err(|e| e.to_string())?;

        Ok((pem_cert, pem_key))
    }
}

impl Default for CertManager {
    fn default() -> Self {
        Self::new()
    }
}

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

mod hex {
    pub fn encode(data: impl AsRef<[u8]>) -> String {
        data.as_ref().iter().map(|b| format!("{:02x}", b)).collect()
    }
}