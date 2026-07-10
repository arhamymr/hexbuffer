// ponytail: MockForge backend features
use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::State;

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
}

impl MockForgeState {
    pub fn new() -> Self {
        Self {
            domains: Mutex::new(Vec::new()),
            routes: Mutex::new(Vec::new()),
            logs: Mutex::new(Vec::new()),
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
