use pingora_core::upstreams::peer::HttpPeer;
use pingora_proxy::Session;
use crate::proxy::lifecycle::Ctx;

pub fn resolve_host(session: &Session) -> (String, u16, bool) {
    let req_header = session.req_header();

    let is_connect = req_header.method == "CONNECT";
    let uri = &req_header.uri;

    let is_https = uri.scheme_str() == Some("https") || is_connect;

    let host = if is_connect {
        uri.path().split(':').next().unwrap_or("localhost").to_string()
    } else {
        uri.host()
            .or_else(|| req_header.headers.get("Host").and_then(|v| v.to_str().ok()))
            .unwrap_or("localhost")
            .to_string()
    };

    let port = uri.port_u16().unwrap_or_else(|| if is_https { 443 } else { 80 });

    (host, port, is_https)
}

pub async fn create_peer(session: &mut Session, ctx: &mut Ctx) -> Result<Box<HttpPeer>, pingora_core::Error> {
    let (host, port, is_https) = resolve_host(session);

    eprintln!("[peer] create_peer | method={} host={} port={} is_https={} is_mitm_loopback={}",
        session.req_header().method, host, port, is_https, ctx.is_mitm_loopback);

    // PASS 1: CONNECT tunnel establishment - route to loopback TLS MITM
    if session.req_header().method == "CONNECT" && !ctx.is_mitm_loopback {
        eprintln!("[peer] PASS 1: Routing CONNECT to loopback 127.0.0.1:8889");
        let internal_mitm_addr = "127.0.0.1:8889";
        let mut peer = HttpPeer::new(internal_mitm_addr, false, "".to_string());
        peer.sni = host.clone();
        ctx.is_mitm_loopback = true;
        ctx.sni_override = Some(host);
        return Ok(Box::new(peer));
    }

    // PASS 2: Already looped back - use sni_override to connect to real target
    if ctx.is_mitm_loopback {
        let target_host = ctx.sni_override.clone().unwrap_or(host);
        eprintln!("[peer] PASS 2: Direct TLS to {}:443", target_host);
        let target_addr = format!("{}:443", target_host);
        let peer = HttpPeer::new(target_addr, true, target_host);
        return Ok(Box::new(peer));
    }

    // Regular HTTP/HTTPS request - use resolved host/port
    let target_addr = format!("{}:{}", host, port);
    eprintln!("[peer] Regular: {}:{} tls={}", host, port, is_https);
    let peer = HttpPeer::new(target_addr, is_https, host);

    Ok(Box::new(peer))
}