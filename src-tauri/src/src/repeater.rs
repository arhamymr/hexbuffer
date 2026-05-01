use reqwest::{Client, Method, header::{HeaderMap, HeaderName, HeaderValue, CONTENT_LENGTH}};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: String,
    #[serde(default = "default_follow_redirects")]
    pub follow_redirects: bool,
    #[serde(default = "default_max_hops")]
    pub max_hops: u32,
}

fn default_follow_redirects() -> bool {
    true
}

fn default_max_hops() -> u32 {
    10
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u64,
    pub final_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct IntruderPayload {
    pub position: usize,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct IntruderResult {
    pub id: String,
    pub payload: String,
    pub status: Option<u16>,
    pub response_length: Option<usize>,
    pub response_time_ms: Option<u64>,
    pub error: Option<String>,
    pub comment: Option<String>,
}

pub struct Repeater {
    client: Client,
}

impl Repeater {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .danger_accept_invalid_certs(true)
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    pub async fn send_request(&self, request: &HttpRequest) -> Result<HttpResponse, String> {
        let method = Method::from_bytes(request.method.as_bytes())
            .map_err(|_| format!("Invalid HTTP method: {}", request.method))?;

        let mut headers = HeaderMap::new();
        for (key, value) in &request.headers {
            let header_name = HeaderName::from_bytes(key.as_bytes())
                .map_err(|_| format!("Invalid header name: {}", key))?;
            let header_value = HeaderValue::from_str(value)
                .map_err(|_| format!("Invalid header value for {}: {}", key, value))?;
            headers.insert(header_name, header_value);
        }

        let mut body = request.body.clone();
        if !body.is_empty() && !headers.contains_key(CONTENT_LENGTH) && !headers.contains_key("content-type") {
            headers.insert(
                CONTENT_LENGTH,
                HeaderValue::from_str(&body.len().to_string()).unwrap(),
            );
        }

        let mut url = reqwest::Url::parse(&request.url)
            .map_err(|e| format!("Invalid URL: {}", e))?;

        let mut hop_count = 0;
        let mut _final_url = String::new();
        let start = Instant::now();

        loop {
            if hop_count >= request.max_hops {
                return Err(format!("Max redirects ({}) exceeded", request.max_hops));
            }

            let mut req_builder = self.client.request(method.clone(), url.as_str())
                .headers(headers.clone());

            if !body.is_empty() && (method == Method::POST || method == Method::PUT || method == Method::PATCH) {
                req_builder = req_builder.body(body.clone());
            }

            let response = req_builder.send().await
                .map_err(|e| format!("Request failed: {}", e))?;

            let status = response.status().as_u16();
            let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

            let mut response_headers = HashMap::new();
            for (key, value) in response.headers() {
                if let Ok(v) = value.to_str() {
                    response_headers.insert(key.to_string(), v.to_string());
                }
            }

            let response_body = response.text().await
                .map_err(|e| format!("Failed to read response body: {}", e))?;

            let time_ms = start.elapsed().as_millis() as u64;
            _final_url = url.to_string();

            if request.follow_redirects && (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                if let Some(location) = response_headers.get("location") {
                    hop_count += 1;
                    url = url.join(location)
                        .map_err(|_| format!("Invalid redirect location: {}", location))?;

                    if !body.is_empty() && (status == 301 || status == 302 || status == 303) {
                        if let Ok(new_body) = serde_json::to_string(&body) {
                            body = new_body;
                        }
                    }
                    continue;
                }
            }

            return Ok(HttpResponse {
                status,
                status_text,
                headers: response_headers,
                body: response_body,
                time_ms,
                final_url: _final_url,
            });
        }
    }
}

impl Default for Repeater {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simple_get() {
        let repeater = Repeater::new();
        let request = HttpRequest {
            method: "GET".to_string(),
            url: "https://httpbin.org/get".to_string(),
            headers: HashMap::new(),
            body: String::new(),
            follow_redirects: true,
            max_hops: 10,
        };

        let result = repeater.send_request(&request).await;
        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.status, 200);
    }
}