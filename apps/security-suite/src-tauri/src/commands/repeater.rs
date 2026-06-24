use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use futures_util::{SinkExt, StreamExt};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

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
    for (name, value) in &request.headers {
        builder = builder.header(name, value);
    }

    if !request.body.is_empty() {
        let mut body_bytes: Vec<u8> = request.body.into_bytes();

        let content_encoding = request
            .headers
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("content-encoding"))
            .map(|(_, v)| v.clone());

        if let Some(encoding) = content_encoding {
            if !encoding.is_empty() {
                match crate::proxy::lifecycle::body_decoder::encode_body(&encoding, &body_bytes) {
                    Ok(encoded) => body_bytes = encoded,
                    Err(e) => eprintln!("[repeater] Failed to re-encode body ({encoding}): {e}"),
                }
            }
        }

        builder = builder.body(body_bytes);
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

struct WsConnectionHandle {
    cancel: tokio::sync::oneshot::Sender<()>,
    outgoing: tokio::sync::mpsc::UnboundedSender<String>,
}

#[derive(Default)]
pub struct WsRepeaterState {
    connections: Arc<Mutex<HashMap<String, WsConnectionHandle>>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WsRepeaterMessage {
    pub connection_id: String,
    pub direction: String,
    pub message_type: String,
    pub payload: String,
    pub timestamp: String,
}

#[tauri::command]
pub async fn ws_repeater_connect(
    app: AppHandle,
    state: tauri::State<'_, WsRepeaterState>,
    url: String,
    _headers: HashMap<String, String>,
) -> Result<String, String> {
    let url = if url.starts_with("https://") {
        url.replacen("https://", "wss://", 1)
    } else if url.starts_with("http://") {
        url.replacen("http://", "ws://", 1)
    } else {
        url
    };

    let (ws_stream, _response) = connect_async(url.as_str())
        .await
        .map_err(|e| format!("WebSocket connection failed: {}", e))?;

    let connection_id = uuid::Uuid::new_v4().to_string();
    let (mut write, mut read) = ws_stream.split();

    let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();
    let (outgoing_tx, mut outgoing_rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    let handle = WsConnectionHandle {
        cancel: cancel_tx,
        outgoing: outgoing_tx,
    };

    state
        .connections
        .lock()
        .unwrap()
        .insert(connection_id.clone(), handle);

    let app_handle = app.clone();
    let conn_id = connection_id.clone();
    let connections = state.connections.clone();

    tokio::spawn(async move {
        let mut cancel_rx = cancel_rx;
        loop {
            tokio::select! {
                msg = read.next() => {
                    match msg {
                        Some(Ok(msg)) => {
                            let (message_type, payload): (&str, String) = match &msg {
                                Message::Text(text) => ("text", text.to_string()),
                                Message::Binary(data) => ("binary", String::from_utf8_lossy(data).to_string()),
                                Message::Ping(_) => ("ping", String::new()),
                                Message::Pong(_) => ("pong", String::new()),
                                Message::Close(_) => ("close", String::new()),
                                Message::Frame(_) => ("binary", String::new()),
                            };

                            let event = WsRepeaterMessage {
                                connection_id: conn_id.clone(),
                                direction: "inbound".to_string(),
                                message_type: message_type.to_string(),
                                payload,
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            };

                            let _ = app_handle.emit("ws-repeater-message", &event);

                            if message_type == "close" {
                                break;
                            }
                        }
                        Some(Err(_)) | None => {
                            let event = WsRepeaterMessage {
                                connection_id: conn_id.clone(),
                                direction: "inbound".to_string(),
                                message_type: "close".to_string(),
                                payload: String::new(),
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            };
                            let _ = app_handle.emit("ws-repeater-message", &event);
                            break;
                        }
                    }
                }
                outgoing = outgoing_rx.recv() => {
                    match outgoing {
                        Some(text) => {
                            if let Err(e) = write.send(Message::Text(text.into())).await {
                                eprintln!("[ws-repeater] send error: {}", e);
                                break;
                            }
                        }
                        None => break,
                    }
                }
                _ = &mut cancel_rx => {
                    break;
                }
            }
        }

        let _ = write.close().await;
        connections.lock().unwrap().remove(&conn_id);
    });

    Ok(connection_id)
}

#[tauri::command]
pub async fn ws_repeater_send(
    state: tauri::State<'_, WsRepeaterState>,
    connection_id: String,
    message: String,
) -> Result<(), String> {
    let connections = state.connections.lock().unwrap();
    let handle = connections
        .get(&connection_id)
        .ok_or_else(|| "Connection not found".to_string())?;

    handle
        .outgoing
        .send(message)
        .map_err(|_| "Connection closed".to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn ws_repeater_disconnect(
    state: tauri::State<'_, WsRepeaterState>,
    connection_id: String,
) -> Result<(), String> {
    let handle = {
        let mut connections = state.connections.lock().unwrap();
        connections
            .remove(&connection_id)
            .ok_or_else(|| "Connection not found".to_string())?
    };

    let _ = handle.cancel.send(());

    Ok(())
}
