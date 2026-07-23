use std::collections::HashMap;
use std::time::Duration;

use hexbuffer_proxy::{Body, RequestOrResponse};
use hyper::{header::HeaderName, header::HeaderValue, Response};
use tauri::{AppHandle, Emitter, Manager};

use super::lifecycle::Ctx;

/// Returns a mocked response if the request matches a MockForge route, otherwise None.
pub async fn try_intercept(
    app_handle: &AppHandle,
    ctx: &Ctx,
) -> Option<RequestOrResponse> {
    use rand::Rng;

    let mock_state = app_handle.try_state::<crate::commands::mock_forge::MockForgeState>()?;

    let uri_parsed = url::Url::parse(&ctx.req_uri).ok();
    let host_str_raw = uri_parsed.as_ref().and_then(|u| u.host_str()).unwrap_or("");
    let host_str = if host_str_raw.is_empty() {
        ctx.req_headers
            .get("host")
            .map(|h| h.split(':').next().unwrap_or(h))
            .unwrap_or("")
    } else {
        host_str_raw
    };

    let path_str = uri_parsed
        .as_ref()
        .map(|u| u.path())
        .unwrap_or_else(|| ctx.req_uri.split('?').next().unwrap_or("/"));

    let query_map: HashMap<String, String> = if let Some(ref u) = uri_parsed {
        u.query_pairs().into_owned().collect()
    } else if let Some(pos) = ctx.req_uri.find('?') {
        url::form_urlencoded::parse(ctx.req_uri[pos + 1..].as_bytes())
            .into_owned()
            .collect()
    } else {
        HashMap::new()
    };

    let matched = {
        let domains_guard = mock_state.domains.lock().unwrap();
        let routes_guard = mock_state.routes.lock().unwrap();
        crate::commands::mock_forge::find_matching_route(
            &domains_guard,
            &routes_guard,
            host_str,
            &ctx.req_method,
            path_str,
            &ctx.req_headers,
            &query_map,
            &ctx.req_body,
            false, // is_local_server = false
        )
    };

    let (domain, route) = matched?;

    let start_time = std::time::Instant::now();
    let mut latency_ms: u64 = 0;
    let mut status_code = route.status_code;

    // Apply chaos latency
    if route.chaos.latency_mode == "fixed" {
        if let Some(fixed) = route.chaos.latency_fixed {
            latency_ms = fixed;
            tokio::time::sleep(Duration::from_millis(fixed)).await;
        }
    } else if route.chaos.latency_mode == "random" {
        if let (Some(min), Some(max)) = (route.chaos.latency_min, route.chaos.latency_max) {
            if max >= min {
                let rand_val = rand::thread_rng().gen_range(min..=max);
                latency_ms = rand_val;
                tokio::time::sleep(Duration::from_millis(rand_val)).await;
            }
        }
    }

    // Apply chaos error rate
    if let Some(err_rate) = route.chaos.error_rate {
        if err_rate > 0.0 {
            let roll = rand::thread_rng().gen_range(0.0..100.0f64);
            if roll < err_rate {
                status_code = route.chaos.error_status.unwrap_or(500);
            }
        }
    }

    let log_entry = crate::commands::mock_forge::RequestLog {
        id: format!("l{}", uuid::Uuid::new_v4()),
        domain_id: domain.id.clone(),
        route_id: Some(route.id.clone()),
        method: ctx.req_method.clone(),
        path: path_str.to_string(),
        status_code,
        latency_ms: if latency_ms == 0 {
            start_time.elapsed().as_millis() as u64
        } else {
            latency_ms
        },
        timestamp: chrono::Utc::now().to_rfc3339(),
        request_headers: ctx.req_headers.clone(),
        request_body: if ctx.req_body.is_empty() {
            None
        } else {
            Some(String::from_utf8_lossy(&ctx.req_body).into_owned())
        },
    };

    {
        let mut logs_lock = mock_state.logs.lock().unwrap();
        logs_lock.insert(0, log_entry.clone());
        if logs_lock.len() > 200 {
            logs_lock.truncate(200);
        }
    }

    let _ = app_handle.emit("mock-forge-log", log_entry);

    let mut builder = Response::builder().status(status_code);
    for (k, v) in &route.response_headers {
        if k.eq_ignore_ascii_case("content-length")
            || k.eq_ignore_ascii_case("content-encoding")
            || k.eq_ignore_ascii_case("transfer-encoding")
        {
            continue;
        }
        if let (Ok(name), Ok(val)) = (
            HeaderName::from_bytes(k.as_bytes()),
            HeaderValue::from_str(v),
        ) {
            builder = builder.header(name, val);
        }
    }

    let body_content = if status_code == route.status_code {
        route.response_body.clone()
    } else {
        format!("Simulated chaos error status: {}", status_code)
    };

    builder = builder.header("content-length", body_content.len().to_string());

    Some(RequestOrResponse::Response(
        builder.body(Body::from(bytes::Bytes::from(body_content))).unwrap(),
    ))
}
