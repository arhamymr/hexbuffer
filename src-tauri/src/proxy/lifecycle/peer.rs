use pingora_core::upstreams::peer::HttpPeer;
use pingora_core::Result;
use pingora_proxy::Session;

use super::Ctx;

pub fn resolve_host(session: &mut Session) -> (String, u16, bool) {
    let uri_string = session.req_header().uri.to_string();

    let parsed_uri: Option<url::Url> = url::Url::parse(&uri_string).ok();

    let is_https = parsed_uri
        .as_ref()
        .map(|u| u.scheme() == "https")
        .unwrap_or(false);

    let host = parsed_uri
        .as_ref()
        .and_then(|u: &url::Url| u.host_str().map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .or_else(|| {
            session
                .get_header("Host")
                .and_then(|v| v.to_str().ok())
                .and_then(|h| {
                    h.split(':').next().map(|s| s.to_string())
                })
                .filter(|s| !s.is_empty())
        })
        .unwrap_or_else(|| "localhost".to_string());

    let port = parsed_uri
        .as_ref()
        .and_then(|u: &url::Url| u.port())
        .or_else(|| session.req_header().uri.port_u16())
        .unwrap_or_else(|| if is_https { 443 } else { 80 });

    (host, port, is_https)
}

pub fn build_peer(addr: &str, host: &str, tls: bool) -> HttpPeer {
    HttpPeer::new(addr, tls, host.to_string())
}

pub fn create_peer(session: &mut Session, _ctx: &mut Ctx) -> Result<Box<HttpPeer>> {
    let (host, port, is_https) = resolve_host(session);
    let addr = format!("{host}:{port}");

    println!("[peer] connecting to {} (host={}, port={}, tls={})", addr, host, port, is_https);

    let host_for_header = host.as_str();

    Ok(Box::new(build_peer(&addr, host_for_header, is_https)))
}