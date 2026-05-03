use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::types::{ProxiedRequest, ProxiedResponse};
use super::utils::{now_ms, rand_id, parse_url, parse_query_params, extract_cookies};

#[derive(Clone, Serialize, Deserialize)]
pub struct ApiCall {
    pub id: String,
    pub session_id: String,
    pub target_id: String,
    pub timestamp: u64,
    pub request_type: RequestType,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub query_params: HashMap<String, String>,
    pub headers: HashMap<String, String>,
    pub cookies: HashMap<String, String>,
    pub request_body: Option<String>,
    pub request_body_size: u64,
    pub response_status: Option<u16>,
    pub response_status_text: Option<String>,
    pub response_headers: HashMap<String, String>,
    pub response_cookies: HashMap<String, String>,
    pub response_body: Option<String>,
    pub response_body_size: u64,
    pub response_content_type: Option<String>,
    pub security_state: String,
    pub server_ip: Option<String>,
    pub duration_ms: Option<u64>,
    #[serde(rename = "type")]
    pub event_type: String,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
pub enum RequestType {
    XHR,
    Media,
    CSS,
    JS,
    Document,
    Font,
    Other,
}

impl RequestType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RequestType::XHR => "XHR",
            RequestType::Media => "Media",
            RequestType::CSS => "CSS",
            RequestType::JS => "JS",
            RequestType::Document => "Document",
            RequestType::Font => "Font",
            RequestType::Other => "Other",
        }
    }

    pub fn from_headers(
        sec_fetch_mode: Option<&str>,
        accept: Option<&str>,
        content_type: Option<&str>,
        url: &str,
    ) -> Self {
        if let Some(mode) = sec_fetch_mode {
            if mode == "cors" {
                if let Some(accept_hdr) = accept {
                    if accept_hdr.contains("application/json") {
                        return RequestType::XHR;
                    }
                }
            }
        }

        if let Some(ct) = content_type {
            if ct.contains("application/json") {
                return RequestType::XHR;
            }
            if ct.starts_with("text/css") || url.ends_with(".css") {
                return RequestType::CSS;
            }
            if ct.contains("javascript") || url.ends_with(".js") {
                return RequestType::JS;
            }
            if ct.starts_with("image/") || ct.starts_with("video/") || ct.starts_with("audio/") {
                return RequestType::Media;
            }
            if ct.starts_with("font/") || url.ends_with(".woff2") || url.ends_with(".woff") {
                return RequestType::Font;
            }
            if ct.starts_with("text/html") {
                return RequestType::Document;
            }
        }

        if url.contains("/api/") || url.contains("/v1/") || url.contains("/v2/") {
            return RequestType::XHR;
        }

        RequestType::Other
    }
}

impl ApiCall {
    pub fn from_proxy(
        req: &ProxiedRequest,
        res: &Option<ProxiedResponse>,
        target_id: String,
        duration_ms: u64,
    ) -> Self {
        let ts = now_ms();
        let (host, path) = parse_url(&req.url);
        let query_params = parse_query_params(&req.url);

        let sec_fetch_mode = req.headers.get("sec-fetch-mode").map(|s| s.as_str());
        let accept = req.headers.get("accept").map(|s| s.as_str());
        let content_type = req.headers.get("content-type").map(|s| s.as_str());
        let request_type = RequestType::from_headers(sec_fetch_mode, accept, content_type, &req.url);

        let cookies = req.headers.get("cookie")
            .map(|v| parse_cookie_str(v))
            .unwrap_or_default();

        let response_status = res.as_ref().map(|r| r.status);
        let response_status_text = res.as_ref().map(|r| r.status_text.clone());
        let (response_headers, response_cookies, response_body, response_body_size, response_content_type) = 
            res.as_ref()
                .map(|r| {
                    let ct = r.headers.get("content-type").cloned();
                    let cookies = r.headers.get("set-cookie")
                        .map(|v| parse_cookie_str(v))
                        .unwrap_or_default();
                    (r.headers.clone(), cookies, r.body.clone(), r.body.as_ref().map(|b| b.len() as u64).unwrap_or(0), ct)
                })
                .unwrap_or((HashMap::new(), HashMap::new(), None, 0, None));

        Self {
            id: format!("call_{}_{}", ts, rand_id()),
            session_id: format!("session_{}", ts),
            target_id,
            timestamp: ts,
            request_type,
            method: req.method.clone(),
            url: req.url.clone(),
            host,
            path,
            query_params,
            headers: req.headers.clone(),
            cookies,
            request_body: req.body.clone(),
            request_body_size: req.body.as_ref().map(|b| b.len() as u64).unwrap_or(0),
            response_status,
            response_status_text,
            response_headers,
            response_cookies,
            response_body,
            response_body_size,
            response_content_type,
            security_state: "unknown".to_string(),
            server_ip: None,
            duration_ms: Some(duration_ms),
            event_type: "http-log".to_string(),
        }
    }

    pub fn to_curl(&self) -> String {
        let mut cmd = format!("curl -X {} '{}'", self.method, self.url);

        for (key, value) in &self.headers {
            if key != "host" && key != "cookie" {
                cmd.push_str(&format!(" \\\n  -H '{}: {}'", key, value));
            }
        }

        if !self.cookies.is_empty() {
            let cookie_str = self.cookies
                .iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect::<Vec<_>>()
                .join("; ");
            cmd.push_str(&format!(" \\\n  -b '{}'", cookie_str));
        }

        if let Some(body) = &self.request_body {
            cmd.push_str(&format!(" \\\n  -d '{}'", body));
        }

        cmd
    }
}

fn parse_cookie_str(header: &str) -> HashMap<String, String> {
    let mut cookies = HashMap::new();
    for pair in header.split(';') {
        let pair = pair.trim();
        if let Some((key, value)) = pair.split_once('=') {
            cookies.insert(key.trim().to_string(), value.trim().to_string());
        }
    }
    cookies
}

pub fn adapt_proxy_event_to_apicall(
    event_type: &str,
    id: u64,
    request: &ProxiedRequest,
    response: &Option<ProxiedResponse>,
    target_id: &str,
    duration_ms: u64,
) -> ApiCall {
    let mut api_call = ApiCall::from_proxy(request, response, target_id.to_string(), duration_ms);
    api_call.id = format!("call_{}", id);
    api_call.event_type = event_type.to_string();
    api_call
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_type_classification() {
        assert_eq!(
            RequestType::from_headers(Some("cors"), Some("application/json"), None, "https://api.example.com"),
            RequestType::XHR
        );
        assert_eq!(
            RequestType::from_headers(None, None, Some("text/css"), "https://example.com/style.css"),
            RequestType::CSS
        );
        assert_eq!(
            RequestType::from_headers(None, None, Some("application/json"), "https://example.com/api/v1/users"),
            RequestType::XHR
        );
    }

    #[test]
    fn test_cookie_parsing() {
        let cookies = parse_cookie_str("session=abc123; user=john; token=xyz");
        assert_eq!(cookies.get("session"), Some(&"abc123".to_string()));
        assert_eq!(cookies.get("user"), Some(&"john".to_string()));
    }
}