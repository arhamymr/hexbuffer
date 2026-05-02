use reqwest::{Client, Method, header::{HeaderMap, HeaderName, HeaderValue, CONTENT_LENGTH}};
use std::time::{Duration, Instant};

use super::types::{HttpRequest, HttpResponse};

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

        let headers = build_header_map(&request.headers)?;

        let mut body = request.body.clone();
        let mut headers_with_content = headers;
        if !body.is_empty() && !headers_with_content.contains_key(CONTENT_LENGTH) && !headers_with_content.contains_key("content-type") {
            headers_with_content.insert(
                CONTENT_LENGTH,
                HeaderValue::from_str(&body.len().to_string()).unwrap(),
            );
        }

        let mut url = reqwest::Url::parse(&request.url)
            .map_err(|e| format!("Invalid URL: {}", e))?;

        let mut hop_count = 0;
        let mut final_url = String::new();
        let start = Instant::now();

        loop {
            if hop_count >= request.max_hops {
                return Err(format!("Max redirects ({}) exceeded", request.max_hops));
            }

            let mut req_builder = self.client.request(method.clone(), url.as_str())
                .headers(headers_with_content.clone());

            if !body.is_empty() && (method == Method::POST || method == Method::PUT || method == Method::PATCH) {
                req_builder = req_builder.body(body.clone());
            }

            let response = req_builder.send().await
                .map_err(|e| format!("Request failed: {}", e))?;

            let status = response.status().as_u16();
            let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

            let mut response_headers = std::collections::HashMap::new();
            for (key, value) in response.headers() {
                if let Ok(v) = value.to_str() {
                    response_headers.insert(key.to_string(), v.to_string());
                }
            }

            let response_body = response.text().await
                .map_err(|e| format!("Failed to read response body: {}", e))?;

            let time_ms = start.elapsed().as_millis() as u64;
            final_url = url.to_string();

            if request.follow_redirects && is_redirect_status(status) {
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
                final_url,
            });
        }
    }
}

impl Default for Repeater {
    fn default() -> Self {
        Self::new()
    }
}

fn build_header_map(headers: &std::collections::HashMap<String, String>) -> Result<HeaderMap, String> {
    let mut header_map = HeaderMap::new();
    for (key, value) in headers {
        let header_name = HeaderName::from_bytes(key.as_bytes())
            .map_err(|_| format!("Invalid header name: {}", key))?;
        let header_value = HeaderValue::from_str(value)
            .map_err(|_| format!("Invalid header value for {}: {}", key, value))?;
        header_map.insert(header_name, header_value);
    }
    Ok(header_map)
}

fn is_redirect_status(status: u16) -> bool {
    matches!(status, 301 | 302 | 303 | 307 | 308)
}