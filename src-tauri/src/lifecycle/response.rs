use pingora_http::ResponseHeader;
use pingora_proxy::Session;

use super::Ctx;

pub fn parse_response(ctx: &mut Ctx, upstream_response: &mut ResponseHeader) {
    ctx.res_status_code = upstream_response.status.as_u16();
    ctx.res_status_text = upstream_response
        .status
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();
    ctx.res_http_version = format!("{:?}", upstream_response.version);

    for (name, value) in upstream_response.headers.iter() {
        if let Ok(v) = value.to_str() {
            ctx.res_headers.insert(name.as_str().to_string(), v.to_string());
        }
    }
}

pub fn handle_response_filter(
    _session: &mut Session,
    upstream_response: &mut ResponseHeader,
    ctx: &mut Ctx,
) {
    println!("[response_filter] start txn_id={} status={}", ctx.transaction_id, upstream_response.status.as_u16());
    parse_response(ctx, upstream_response);
    println!("[response_filter] end txn_id={}", ctx.transaction_id);
}