use std::sync::{Arc, RwLock};
use std::collections::HashMap;

use async_trait::async_trait;
use pingora::listeners::TlsAccept;
use pingora::protocols::tls::TlsRef;
use pingora::tls::ext::{ssl_use_certificate, ssl_use_private_key, ssl_add_chain_cert};
use pingora::tls::ssl::NameType;

use crate::proxy::https::cert::{generate_host_cert, get_ca_cert_x509};
pub mod cert;

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
                eprintln!("[https/tls] Failed to generate cert for {}: {}", host, e);
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
        println!("[https/tls] TlsCertCallback::new called with manager");
        Self { manager }
    }
}

#[async_trait]
impl TlsAccept for TlsCertCallback {
    async fn certificate_callback(&self, ssl: &mut TlsRef) -> () {
        eprintln!("[https/tls] ====== certificate_callback INVOKED ======");
        eprintln!("[https/tls] DEBUG: ssl ref ptr = {:p}", ssl);

        let sni = ssl.servername(NameType::HOST_NAME);
        eprintln!("[https/tls] DEBUG: sni = {:?}", sni);

        let host = match sni {
            Some(h) => h.to_string(),
            None => {
                eprintln!("[https/tls] WARN: No SNI found - HTTP CONNECT (port 80), skipping MITM");
                return;
            }
        };

        println!("[https/tls] Processing TLS MITM for host: {}", host);

        let cert_key = match self.manager.get_cert_for_host(&host) {
            Some(ck) => ck,
            None => {
                eprintln!("[https/tls] ERROR: get_cert_for_host returned None for {}", host);
                return;
            }
        };

        let (cert, key) = cert_key.as_ref();
        eprintln!("[https/tls] DEBUG: cert and key obtained for {}", host);

        if let Err(e) = ssl_use_certificate(ssl, cert) {
            eprintln!("[https/tls] ERROR ssl_use_certificate: {:?} | host: {}", e, host);
            return;
        }
        println!("[https/tls] ssl_use_certificate OK | host: {}", host);

        if let Err(e) = ssl_use_private_key(ssl, key) {
            eprintln!("[https/tls] ERROR ssl_use_private_key: {:?} | host: {}", e, host);
            return;
        }
        println!("[https/tls] ssl_use_private_key OK | host: {}", host);

        if let Ok(ca_cert) = get_ca_cert_x509() {
            if let Err(e) = ssl_add_chain_cert(ssl, &ca_cert) {
                eprintln!("[https/tls] ERROR ssl_add_chain_cert: {:?} | host: {}", e, host);
            } else {
                println!("[https/tls] ssl_add_chain_cert OK | host: {}", host);
            }
        } else {
            eprintln!("[https/tls] ERROR get_ca_cert_x509 failed | host: {}", host);
        }

        println!("[https/tls] ====== certificate_callback COMPLETE for {} ======", host);
    }

    async fn handshake_complete_callback(&self, _ssl: &TlsRef) -> Option<Arc<dyn Send + Sync + std::any::Any>> {
        println!("[https/tls] handshake_complete_callback fired");
        eprintln!("[https/tls] DEBUG: TLS handshake completed successfully");
        None
    }
}