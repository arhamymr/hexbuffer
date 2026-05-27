use std::collections::HashMap;
use std::time::Instant;

use reqwest::Method;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct RepeaterRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Debug, Serialize)]
pub struct RepeaterResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    time_ms: u128,
    final_url: String,
}

#[tauri::command]
pub async fn send_repeater_request(request: RepeaterRequest) -> Result<RepeaterResponse, String> {
    let method = Method::from_bytes(request.method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method: {}", error))?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| format!("Failed to build HTTP client: {}", error))?;

    let mut builder = client.request(method, &request.url);
    for (name, value) in request.headers {
        builder = builder.header(name, value);
    }

    if !request.body.is_empty() {
        builder = builder.body(request.body);
    }

    let started_at = Instant::now();
    let response = builder
        .send()
        .await
        .map_err(|error| format!("Failed to send request: {}", error))?;
    let status = response.status();
    let final_url = response.url().to_string();
    let headers = response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.to_string(),
                value.to_str().unwrap_or_default().to_string(),
            )
        })
        .collect();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read response body: {}", error))?;

    Ok(RepeaterResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_string(),
        headers,
        body,
        time_ms: started_at.elapsed().as_millis(),
        final_url,
    })
}
