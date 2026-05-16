use std::sync::{Arc, RwLock};
use std::collections::HashMap;

use async_trait::async_trait;
use pingora::listeners::TlsAccept;
use pingora::protocols::tls::TlsRef;
use pingora::tls::ext::{ssl_use_certificate, ssl_use_private_key};
use pingora::tls::ssl::NameType;

use super::cert::generate_host_cert;

#[derive(Debug)]
pub struct TlsManager {
    cached_certs: RwLock<HashMap<String, Arc<(pingora::tls::x509::X509, pingora::tls::pkey::PKey<pingora::tls::pkey::Private>)>>>,
}

impl TlsManager {
    pub fn new() -> Self {
        Self {
            cached_certs: RwLock::new(HashMap::new()),
        }
    }

    pub fn get_cert_for_host(&self, host: &str) -> Option<Arc<(pingora::tls::x509::X509, pingora::tls::pkey::PKey<pingora::tls::pkey::Private>)>> {
        if let Some(cached) = self.cached_certs.read().unwrap().get(host) {
            return Some(cached.clone());
        }

        let (cert, key) = match generate_host_cert(host) {
            Ok(pair) => pair,
            Err(e) => {
                eprintln!("[tls] Failed to generate cert for {}: {}", host, e);
                return None;
            }
        };

        let ck = Arc::new((cert, key));
        self.cached_certs.write().unwrap().insert(host.to_string(), ck.clone());
        Some(ck)
    }
}

impl Default for TlsManager {
    fn default() -> Self {
        Self::new()
    }
}

pub struct TlsCertCallback {
    manager: Arc<TlsManager>,
}

impl TlsCertCallback {
    pub fn new(manager: Arc<TlsManager>) -> Self {
        Self { manager }
    }
}

#[async_trait]
impl TlsAccept for TlsCertCallback {
    async fn certificate_callback(&self, ssl: &mut TlsRef) -> () {
        let sni = ssl.servername(NameType::HOST_NAME);
        let host = match sni {
            Some(h) => h.to_string(),
            None => {
                eprintln!("[tls] No SNI found in TLS handshake");
                return;
            }
        };

        println!("[tls] Certificate callback for host: {}", host);

        let cert_key = match self.manager.get_cert_for_host(&host) {
            Some(ck) => ck,
            None => {
                eprintln!("[tls] Failed to get certificate for host: {}", host);
                return;
            }
        };

        let (cert, key) = cert_key.as_ref();

        if let Err(e) = ssl_use_certificate(ssl, cert) {
            eprintln!("[tls] Failed to set certificate: {:?}", e);
            return;
        }

        if let Err(e) = ssl_use_private_key(ssl, key) {
            eprintln!("[tls] Failed to set private key: {:?}", e);
            return;
        }

        println!("[tls] Certificate successfully set for host: {}", host);
    }
}