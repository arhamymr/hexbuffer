// ponytail: MockForge backend features
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State, Emitter};
use tokio::net::TcpListener;
use hyper::server::conn::http1;
use hyper_util::rt::TokioIo;
use hyper::service::service_fn;
use hyper::{Request, Response, StatusCode, header::{HeaderName, HeaderValue}};
use http_body_util::Full;
use bytes::Bytes;
use url::form_urlencoded;
use rand::Rng;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockDomain {
    pub id: String,
    pub hostname: String,
    pub ssl: bool,
    pub status: String, // "active" | "inactive"
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestMatcher {
    #[serde(rename = "headerKey")]
    pub header_key: Option<String>,
    #[serde(rename = "headerValue")]
    pub header_value: Option<String>,
    #[serde(rename = "queryKey")]
    pub query_key: Option<String>,
    #[serde(rename = "queryValue")]
    pub query_value: Option<String>,
    #[serde(rename = "bodyContains")]
    pub body_contains: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChaosConfig {
    #[serde(rename = "latencyMode")]
    pub latency_mode: String, // "none" | "fixed" | "random"
    #[serde(rename = "latencyFixed")]
    pub latency_fixed: Option<u64>,
    #[serde(rename = "latencyMin")]
    pub latency_min: Option<u64>,
    #[serde(rename = "latencyMax")]
    pub latency_max: Option<u64>,
    #[serde(rename = "errorRate")]
    pub error_rate: Option<f64>,
    #[serde(rename = "errorStatus")]
    pub error_status: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryParam {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockRoute {
    #[serde(default)]
    pub id: String,
    #[serde(rename = "domainId")]
    pub domain_id: String,
    pub method: String,
    pub path: String,
    #[serde(rename = "statusCode")]
    pub status_code: u16,
    #[serde(rename = "responseBody")]
    pub response_body: String,
    #[serde(rename = "responseHeaders")]
    pub response_headers: HashMap<String, String>,
    pub matchers: Vec<RequestMatcher>,
    pub chaos: ChaosConfig,
    pub enabled: bool,
    #[serde(rename = "requestQueryParams")]
    pub request_query_params: Option<Vec<QueryParam>>,
    #[serde(rename = "requestBody")]
    pub request_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestLog {
    pub id: String,
    #[serde(rename = "domainId")]
    pub domain_id: String,
    #[serde(rename = "routeId")]
    pub route_id: Option<String>,
    pub method: String,
    pub path: String,
    #[serde(rename = "statusCode")]
    pub status_code: u16,
    #[serde(rename = "latencyMs")]
    pub latency_ms: u64,
    pub timestamp: String,
    #[serde(rename = "requestHeaders")]
    pub request_headers: HashMap<String, String>,
    #[serde(rename = "requestBody")]
    pub request_body: Option<String>,
}

pub struct MockForgeState {
    pub domains: Mutex<Vec<MockDomain>>,
    pub routes: Mutex<Vec<MockRoute>>,
    pub logs: Mutex<Vec<RequestLog>>,
    pub port: Mutex<u16>,
}

impl MockForgeState {
    pub fn new() -> Self {
        Self {
            domains: Mutex::new(Vec::new()),
            routes: Mutex::new(Vec::new()),
            logs: Mutex::new(Vec::new()),
            port: Mutex::new(9999),
        }
    }
}

pub fn path_matches(route_path: &str, req_path: &str) -> bool {
    let r_parts: Vec<&str> = route_path.split('/').filter(|s| !s.is_empty()).collect();
    let p_parts: Vec<&str> = req_path.split('/').filter(|s| !s.is_empty()).collect();
    
    if r_parts.len() != p_parts.len() {
        return false;
    }
    
    for (r, p) in r_parts.iter().zip(p_parts.iter()) {
        if r.starts_with(':') {
            continue;
        }
        if r != p {
            return false;
        }
    }
    true
}

fn matchers_satisfied(
    matchers: &[RequestMatcher],
    req_headers: &HashMap<String, String>,
    req_query: &HashMap<String, String>,
    req_body: &[u8],
) -> bool {
    for matcher in matchers {
        if let Some(ref hk) = matcher.header_key {
            let val = req_headers.get(&hk.to_lowercase()).or_else(|| req_headers.get(hk));
            if let Some(ref hv) = matcher.header_value {
                if val.map(|s| s.as_str()) != Some(hv.as_str()) {
                    return false;
                }
            } else if val.is_none() {
                return false;
            }
        }
        if let Some(ref qk) = matcher.query_key {
            let val = req_query.get(qk);
            if let Some(ref qv) = matcher.query_value {
                if val.map(|s| s.as_str()) != Some(qv.as_str()) {
                    return false;
                }
            } else if val.is_none() {
                return false;
            }
        }
        if let Some(ref bc) = matcher.body_contains {
            let body_str = String::from_utf8_lossy(req_body);
            if !body_str.contains(bc) {
                return false;
            }
        }
    }
    true
}

pub fn find_matching_route(
    domains: &[MockDomain],
    routes: &[MockRoute],
    req_host: &str,
    req_method: &str,
    req_path: &str,
    req_headers: &HashMap<String, String>,
    req_query: &HashMap<String, String>,
    req_body: &[u8],
    is_local_server: bool,
) -> Option<(MockDomain, MockRoute)> {
    let matching_domains: Vec<&MockDomain> = domains
        .iter()
        .filter(|d| {
            if d.status != "active" {
                return false;
            }
            if is_local_server && (req_host.starts_with("localhost") || req_host.starts_with("127.0.0.1")) {
                true
            } else {
                let host_only = req_host.split(':').next().unwrap_or(req_host);
                let d_host_only = d.hostname.split(':').next().unwrap_or(&d.hostname);
                d_host_only.eq_ignore_ascii_case(host_only)
            }
        })
        .collect();

    for d in matching_domains {
        let matching_routes = routes.iter().filter(|r| {
            r.domain_id == d.id
                && r.enabled
                && r.method.eq_ignore_ascii_case(req_method)
                && path_matches(&r.path, req_path)
        });

        for r in matching_routes {
            if matchers_satisfied(&r.matchers, req_headers, req_query, req_body) {
                return Some((d.clone(), r.clone()));
            }
        }
    }
    None
}

pub fn load_mock_forge_from_db(
    state: &MockForgeState,
    db: &crate::db::repository::Database,
) -> Result<(), String> {
    let domains = db.get_mock_domains().map_err(|e| e.to_string())?;
    let routes = db.get_mock_routes().map_err(|e| e.to_string())?;
    *state.domains.lock().unwrap() = domains;
    *state.routes.lock().unwrap() = routes;
    Ok(())
}

#[tauri::command]
pub fn mock_forge_get_domains(state: State<'_, MockForgeState>) -> Vec<MockDomain> {
    state.domains.lock().unwrap().clone()
}

#[tauri::command]
pub fn mock_forge_add_domain(
    state: State<'_, MockForgeState>,
    db: State<'_, crate::db::repository::Database>,
    hostname: String,
    ssl: bool,
) -> Result<MockDomain, String> {
    let domain = MockDomain {
        id: format!("d{}", uuid::Uuid::new_v4()),
        hostname,
        ssl,
        status: "active".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    db.insert_mock_domain(&domain)
        .map_err(|e| format!("Failed to save domain in database: {}", e))?;
    state.domains.lock().unwrap().push(domain.clone());
    Ok(domain)
}

#[tauri::command]
pub fn mock_forge_delete_domain(
    state: State<'_, MockForgeState>,
    db: State<'_, crate::db::repository::Database>,
    id: String,
) -> Result<(), String> {
    db.delete_mock_domain(&id)
        .map_err(|e| format!("Failed to delete domain from database: {}", e))?;
    state.domains.lock().unwrap().retain(|d| d.id != id);
    state.routes.lock().unwrap().retain(|r| r.domain_id != id);
    Ok(())
}

#[tauri::command]
pub fn mock_forge_toggle_domain(
    state: State<'_, MockForgeState>,
    db: State<'_, crate::db::repository::Database>,
    id: String,
) -> Result<(), String> {
    db.toggle_mock_domain(&id)
        .map_err(|e| format!("Failed to toggle domain in database: {}", e))?;
    let mut domains = state.domains.lock().unwrap();
    if let Some(d) = domains.iter_mut().find(|d| d.id == id) {
        d.status = if d.status == "active" { "inactive".to_string() } else { "active".to_string() };
    }
    Ok(())
}

#[tauri::command]
pub fn mock_forge_get_routes(state: State<'_, MockForgeState>) -> Vec<MockRoute> {
    state.routes.lock().unwrap().clone()
}

#[tauri::command]
pub fn mock_forge_add_route(
    state: State<'_, MockForgeState>,
    db: State<'_, crate::db::repository::Database>,
    route: MockRoute,
) -> Result<MockRoute, String> {
    let mut route = route;
    if route.id.is_empty() || route.id.starts_with("new") {
        route.id = format!("r{}", uuid::Uuid::new_v4());
    }
    db.upsert_mock_route(&route)
        .map_err(|e| format!("Failed to save route in database: {}", e))?;
    state.routes.lock().unwrap().push(route.clone());
    Ok(route)
}

#[tauri::command]
pub fn mock_forge_update_route(
    state: State<'_, MockForgeState>,
    db: State<'_, crate::db::repository::Database>,
    id: String,
    patch: MockRoute,
) -> Result<(), String> {
    db.upsert_mock_route(&patch)
        .map_err(|e| format!("Failed to update route in database: {}", e))?;
    let mut routes = state.routes.lock().unwrap();
    if let Some(r) = routes.iter_mut().find(|r| r.id == id) {
        *r = patch;
    }
    Ok(())
}

#[tauri::command]
pub fn mock_forge_delete_route(
    state: State<'_, MockForgeState>,
    db: State<'_, crate::db::repository::Database>,
    id: String,
) -> Result<(), String> {
    db.delete_mock_route(&id)
        .map_err(|e| format!("Failed to delete route from database: {}", e))?;
    state.routes.lock().unwrap().retain(|r| r.id != id);
    Ok(())
}

#[tauri::command]
pub fn mock_forge_get_logs(state: State<'_, MockForgeState>) -> Vec<RequestLog> {
    state.logs.lock().unwrap().clone()
}

#[tauri::command]
pub fn mock_forge_clear_logs(state: State<'_, MockForgeState>) {
    state.logs.lock().unwrap().clear();
}

#[tauri::command]
pub fn mock_forge_get_server_port(state: State<'_, MockForgeState>) -> u16 {
    *state.port.lock().unwrap()
}

pub async fn start_mock_forge_server(app_handle: AppHandle) -> Result<(), String> {
    let preferred_port = 9999;
    let mut port = preferred_port;
    let listener = loop {
        match TcpListener::bind(("0.0.0.0", port)).await {
            Ok(l) => break l,
            Err(e) => {
                eprintln!("[mock-forge] Port {} in use: {}. Trying fallback.", port, e);
                port -= 1;
                if port < 9000 {
                    return Err("Could not find a free port for mock forge server".to_string());
                }
            }
        }
    };

    {
        let state = app_handle.state::<MockForgeState>();
        *state.port.lock().unwrap() = port;
    }

    eprintln!("[mock-forge] Server listening on port {}", port);

    let handle = app_handle.clone();
    
    tokio::task::spawn(async move {
        loop {
            let (stream, _) = match listener.accept().await {
                Ok(conn) => conn,
                Err(e) => {
                    eprintln!("[mock-forge] accept connection error: {:?}", e);
                    continue;
                }
            };
            
            let io = TokioIo::new(stream);
            let handle_clone = handle.clone();
            
            tokio::task::spawn(async move {
                let service = service_fn(move |req| {
                    let handle_inner = handle_clone.clone();
                    async move {
                        handle_local_request(req, handle_inner).await
                    }
                });
                
                if let Err(_err) = http1::Builder::new()
                    .serve_connection(io, service)
                    .await
                {
                    // connection closed
                }
            });
        }
    });

    Ok(())
}

async fn handle_local_request(
    req: Request<hyper::body::Incoming>,
    app_handle: AppHandle,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    use http_body_util::BodyExt;
    
    let state = app_handle.state::<MockForgeState>();
    
    let method = req.method().to_string();
    
    let path_and_query_str = req.uri()
        .path_and_query()
        .map(|pq| pq.as_str().to_string())
        .unwrap_or_else(|| "/".to_string());
    
    let host = req.headers()
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("localhost")
        .to_string();
        
    let mut req_headers = HashMap::new();
    for (name, val) in req.headers() {
        if let Ok(v) = val.to_str() {
            req_headers.insert(name.as_str().to_string(), v.to_string());
        }
    }
    
    let body = req.into_body();
    let body_bytes = match body.collect().await {
        Ok(collected) => collected.to_bytes().to_vec(),
        Err(_) => Vec::new(),
    };

    let (path_str, query_map) = if let Some(pos) = path_and_query_str.find('?') {
        let path = path_and_query_str[..pos].to_string();
        let query = &path_and_query_str[pos + 1..];
        let query_map: HashMap<String, String> = form_urlencoded::parse(query.as_bytes())
            .into_owned()
            .collect();
        (path, query_map)
    } else {
        (path_and_query_str, HashMap::new())
    };
    let path = &path_str;
    
    let (matched, matching_domain) = {
        let domains_guard = state.domains.lock().unwrap();
        let routes_guard = state.routes.lock().unwrap();
        
        let matched = find_matching_route(
            &domains_guard,
            &routes_guard,
            &host,
            &method,
            path,
            &req_headers,
            &query_map,
            &body_bytes,
            true,
        );
        
        let matching_domain = if matched.is_none() {
            domains_guard.iter().find(|d| {
                d.status == "active" && {
                    let host_only = host.split(':').next().unwrap_or(&host);
                    let d_host_only = d.hostname.split(':').next().unwrap_or(&d.hostname);
                    d_host_only.eq_ignore_ascii_case(host_only)
                }
            }).cloned()
        } else {
            None
        };
        
        (matched, matching_domain)
    };
    
    if let Some((domain, route)) = matched {
        let start_time = std::time::Instant::now();
        let mut latency_ms = 0;
        let mut status_code = route.status_code;

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

        if let Some(err_rate) = route.chaos.error_rate {
            if err_rate > 0.0 {
                let roll = rand::thread_rng().gen_range(0.0..100.0);
                if roll < err_rate {
                    if let Some(err_status) = route.chaos.error_status {
                        status_code = err_status;
                    } else {
                        status_code = 500;
                    }
                }
            }
        }
        
        let log_entry = RequestLog {
            id: format!("l{}", uuid::Uuid::new_v4()),
            domain_id: domain.id.clone(),
            route_id: Some(route.id.clone()),
            method: method.clone(),
            path: path.to_string(),
            status_code,
            latency_ms: if latency_ms == 0 { start_time.elapsed().as_millis() as u64 } else { latency_ms },
            timestamp: chrono::Utc::now().to_rfc3339(),
            request_headers: req_headers.clone(),
            request_body: if body_bytes.is_empty() { None } else { Some(String::from_utf8_lossy(&body_bytes).into_owned()) },
        };
        
        {
            let mut logs_lock = state.logs.lock().unwrap();
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
            if let (Ok(name), Ok(val)) = (HeaderName::from_bytes(k.as_bytes()), HeaderValue::from_str(v)) {
                builder = builder.header(name, val);
            }
        }
        
        let body_content = if status_code == route.status_code {
            route.response_body.clone()
        } else {
            format!("Simulated chaos error status: {}", status_code)
        };
        
        let body_len = body_content.len();
        builder = builder.header("content-length", body_len.to_string());
        
        Ok(builder.body(Full::new(Bytes::from(body_content))).unwrap())
    } else {
        if let Some(domain) = matching_domain {
            let log_entry = RequestLog {
                id: format!("l{}", uuid::Uuid::new_v4()),
                domain_id: domain.id.clone(),
                route_id: None,
                method: method.clone(),
                path: path.to_string(),
                status_code: 404,
                latency_ms: 0,
                timestamp: chrono::Utc::now().to_rfc3339(),
                request_headers: req_headers.clone(),
                request_body: if body_bytes.is_empty() { None } else { Some(String::from_utf8_lossy(&body_bytes).into_owned()) },
            };
            
            {
                let mut logs_lock = state.logs.lock().unwrap();
                logs_lock.insert(0, log_entry.clone());
                if logs_lock.len() > 200 {
                    logs_lock.truncate(200);
                }
            }
            let _ = app_handle.emit("mock-forge-log", log_entry);
        }
        
        Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Full::new(Bytes::from("404 Not Found (MockForge)")))
            .unwrap())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_matches() {
        assert!(path_matches("/v1/payments/:id", "/v1/payments/pay_123"));
        assert!(path_matches("/auth/login", "/auth/login"));
        assert!(!path_matches("/auth/login", "/auth/me"));
        assert!(path_matches("/users/:id/profile/:section", "/users/1/profile/billing"));
    }

    #[test]
    fn test_find_matching_route_case_insensitive() {
        let domains = vec![MockDomain {
            id: "d1".to_string(),
            hostname: "api.example.com".to_string(),
            ssl: true,
            status: "active".to_string(),
            created_at: "".to_string(),
        }];
        let routes = vec![MockRoute {
            id: "r1".to_string(),
            domain_id: "d1".to_string(),
            method: "GET".to_string(),
            path: "/v1/users".to_string(),
            status_code: 200,
            response_body: "{}".to_string(),
            response_headers: HashMap::new(),
            matchers: vec![],
            chaos: ChaosConfig {
                latency_mode: "none".to_string(),
                latency_fixed: None,
                latency_min: None,
                latency_max: None,
                error_rate: None,
                error_status: None,
            },
            enabled: true,
            request_query_params: None,
            request_body: None,
        }];

        let req_headers = HashMap::new();
        let req_query = HashMap::new();
        let matched = find_matching_route(
            &domains,
            &routes,
            "API.EXAMPLE.COM",
            "get",
            "/v1/users",
            &req_headers,
            &req_query,
            &[],
            false,
        );
        assert!(matched.is_some());
        let (d, r) = matched.unwrap();
        assert_eq!(d.id, "d1");
        assert_eq!(r.id, "r1");
    }

    #[test]
    fn test_find_matching_route_with_port() {
        let domains = vec![MockDomain {
            id: "d1".to_string(),
            hostname: "api.example.com:8080".to_string(),
            ssl: true,
            status: "active".to_string(),
            created_at: "".to_string(),
        }];
        let routes = vec![MockRoute {
            id: "r1".to_string(),
            domain_id: "d1".to_string(),
            method: "GET".to_string(),
            path: "/v1/users".to_string(),
            status_code: 200,
            response_body: "{}".to_string(),
            response_headers: HashMap::new(),
            matchers: vec![],
            chaos: ChaosConfig {
                latency_mode: "none".to_string(),
                latency_fixed: None,
                latency_min: None,
                latency_max: None,
                error_rate: None,
                error_status: None,
            },
            enabled: true,
            request_query_params: None,
            request_body: None,
        }];

        let req_headers = HashMap::new();
        let req_query = HashMap::new();
        let matched = find_matching_route(
            &domains,
            &routes,
            "api.example.com:9000",
            "GET",
            "/v1/users",
            &req_headers,
            &req_query,
            &[],
            false,
        );
        assert!(matched.is_some());
        let (d, r) = matched.unwrap();
        assert_eq!(d.id, "d1");
        assert_eq!(r.id, "r1");
    }
}
