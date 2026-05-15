use pingora_proxy::Session;

use super::Ctx;

pub fn parse_request(session: &mut Session, ctx: &mut Ctx) {
    ctx.client_addr = session.client_addr().map(|a| a.to_string()).unwrap_or_default();

    let req = session.req_header();
    ctx.req_method = req.method.as_str().to_string();
    ctx.req_uri = req.uri.to_string();
    ctx.req_http_version = format!("{:?}", req.version);

    for (name, value) in req.headers.iter() {
        if let Ok(v) = value.to_str() {
            ctx.req_headers.insert(name.as_str().to_string(), v.to_string());
        }
    }
}