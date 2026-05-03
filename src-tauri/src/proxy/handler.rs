use bytes::Bytes;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, Notify};
use tokio::time::{Duration, timeout};

use super::body::{BodyCapture, BodySnapshot, DEFAULT_REQUEST_BODY_LIMIT, DEFAULT_RESPONSE_BODY_LIMIT};
use super::events::{next_id, ProxyEvent};
use super::intercept::InterceptConfig;
use super::types::{InterceptAction, InterceptDecision, ProxiedRequest, ProxiedResponse};

const INTERCEPT_TIMEOUT_SECS: u64 = 120;
const EVENT_CHANNEL_SIZE: usize = 500;

#[derive(Clone)]
pub enum CapturedRequest {
    Buffered(ProxiedRequest),
    Streaming {
        method: String,
        url: String,
        version: String,
        headers: HashMap<String, String>,
        body: super::body::BodyCapture,
        done: Arc<Notify>,
        time: i64,
    },
}

impl CapturedRequest {
    pub fn into_proxied_request(self) -> ProxiedRequest {
        match self {
            Self::Buffered(request) => request,
            Self::Streaming {
                method,
                url,
                version,
                headers,
                body,
                done: _,
                time,
            } => {
                let snapshot = body.snapshot();
                log_truncated_capture("request", &snapshot);
                let path = url.split("://").nth(1).unwrap_or("/").split('/').skip(1).collect::<Vec<_>>().join("/");
                ProxiedRequest::new(method, url, path, version, headers, snapshot_to_string(snapshot), time)
            }
        }
    }
}

fn snapshot_to_string(snapshot: BodySnapshot) -> Option<String> {
    if snapshot.bytes.is_empty() {
        None
    } else {
        Some(String::from_utf8_lossy(&snapshot.bytes).to_string())
    }
}

fn log_truncated_capture(kind: &str, snapshot: &BodySnapshot) {
    if snapshot.truncated {
        tracing::warn!(
            "Captured {} body truncated at {} bytes after seeing {} bytes",
            kind,
            snapshot.bytes.len(),
            snapshot.total_seen
        );
    }
}

fn try_send_event(tx: &mpsc::Sender<ProxyEvent>, event: ProxyEvent) {
    match tx.try_send(event) {
        Ok(()) => {}
        Err(mpsc::error::TrySendError::Full(_)) => {
            tracing::warn!("Event channel full, dropping event");
        }
        Err(mpsc::error::TrySendError::Closed(_)) => {
            tracing::debug!("Event channel closed");
        }
    }
}

pub struct CapturingHandler {
    event_tx: mpsc::Sender<ProxyEvent>,
    captured_request: Option<CapturedRequest>,
    pending_id: Option<u64>,
    intercept: Option<Arc<InterceptConfig>>,
    request_body_limit: Option<usize>,
    response_body_limit: Option<usize>,
}

impl std::fmt::Debug for CapturingHandler {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CapturingHandler")
            .field("captured_request", &self.captured_request.is_some())
            .field("pending_id", &self.pending_id)
            .finish_non_exhaustive()
    }
}

impl CapturingHandler {
    pub fn new(event_tx: mpsc::Sender<ProxyEvent>) -> Self {
        Self {
            event_tx,
            captured_request: None,
            pending_id: None,
            intercept: None,
            request_body_limit: DEFAULT_REQUEST_BODY_LIMIT,
            response_body_limit: DEFAULT_RESPONSE_BODY_LIMIT,
        }
    }

    pub fn with_intercept(mut self, cfg: Arc<InterceptConfig>) -> Self {
        self.intercept = Some(cfg);
        self
    }

    pub fn with_request_body_limit(mut self, limit: Option<usize>) -> Self {
        self.request_body_limit = limit;
        self
    }

    pub fn with_response_body_limit(mut self, limit: Option<usize>) -> Self {
        self.response_body_limit = limit;
        self
    }

    pub fn take_captured_request(&mut self) -> Option<ProxiedRequest> {
        self.captured_request.take().map(CapturedRequest::into_proxied_request)
    }

    pub fn take_pending_id(&mut self) -> Option<u64> {
        self.pending_id.take()
    }

    pub fn event_tx_clone(&self) -> mpsc::Sender<ProxyEvent> {
        self.event_tx.clone()
    }

    pub fn should_buffer_request(&self) -> bool {
        if let Some(ref cfg) = self.intercept {
            if cfg.is_enabled() {
                return true;
            }
        }
        false
    }

    pub fn should_buffer_response(&self) -> bool {
        false
    }

    pub async fn handle_request(
        &mut self,
        method: String,
        url: String,
        version: String,
        headers: HashMap<String, String>,
        body: Option<Vec<u8>>,
    ) -> Option<CapturedRequest> {
        let id = next_id();
        self.pending_id = Some(id);

        let body_limit = self.request_body_limit;
        let request_body = match body {
            Some(data) => {
                let capture = BodyCapture::new(body_limit);
                capture.append(&data);
                let snapshot = capture.snapshot();
                let path = url.split("://").nth(1).unwrap_or("/").split('/').skip(1).collect::<Vec<_>>().join("/");
                if self.should_buffer_request() {
                    CapturedRequest::Buffered(ProxiedRequest::new(
                        method.clone(),
                        url.clone(),
                        path.clone(),
                        version.clone(),
                        headers.clone(),
                        snapshot_to_string(snapshot),
                        chrono::Local::now().timestamp_millis(),
                    ))
                } else {
                    let done = Arc::new(Notify::new());
                    CapturedRequest::Streaming {
                        method: method.clone(),
                        url: url.clone(),
                        version: version.clone(),
                        headers: headers.clone(),
                        body: capture,
                        done: Arc::clone(&done),
                        time: chrono::Local::now().timestamp_millis(),
                    }
                }
            }
            None => {
                let path = url.split("://").nth(1).unwrap_or("/").split('/').skip(1).collect::<Vec<_>>().join("/");
                CapturedRequest::Buffered(ProxiedRequest::new(
                    method.clone(),
                    url.clone(),
                    path,
                    version.clone(),
                    headers.clone(),
                    None,
                    chrono::Local::now().timestamp_millis(),
                ))
            }
        };

        if let Some(ref cfg) = self.intercept {
            if cfg.is_enabled() {
                return self.handle_intercepted_request(id, request_body, cfg.clone()).await;
            }
        }

        self.captured_request = Some(request_body.clone());
        Some(request_body)
    }

    async fn handle_intercepted_request(
        &mut self,
        id: u64,
        request: CapturedRequest,
        cfg: Arc<InterceptConfig>,
    ) -> Option<CapturedRequest> {
        let proxied_req = request.clone().into_proxied_request();
        let rx = cfg.register(id);

        let event = ProxyEvent::request_intercepted(
            id,
            proxied_req.clone(),
            chrono::Local::now().timestamp_millis(),
        );
        if self.event_tx.try_send(event).is_err() {
            cfg.resolve(id, InterceptDecision::forward());
            tracing::warn!("Event channel full, skipping intercept for id={}", id);
            return Some(request);
        }

        match timeout(Duration::from_secs(INTERCEPT_TIMEOUT_SECS), rx).await {
            Ok(Ok(InterceptDecision { action, method, url, headers, body, status, status_text, response_headers })) => {
                match action {
                    InterceptAction::Forward => {
                        self.captured_request = Some(request.clone());
                        Some(request)
                    }
                    InterceptAction::Modified => {
                        let m = method.unwrap_or_else(|| proxied_req.method.clone());
                        let u = url.unwrap_or_else(|| proxied_req.url.clone());
                        let h = headers.unwrap_or_else(|| proxied_req.headers.clone());
                        let b = body.unwrap_or_else(|| proxied_req.body.clone().unwrap_or_default());

                        let modified_path = u.split("://").nth(1).unwrap_or("/").split('/').skip(1).collect::<Vec<_>>().join("/");
                        let modified_req = ProxiedRequest::new(
                            m,
                            u,
                            modified_path,
                            proxied_req.version.clone(),
                            h,
                            Some(b),
                            chrono::Local::now().timestamp_millis(),
                        );
                        self.captured_request = Some(CapturedRequest::Buffered(modified_req));
                        self.captured_request.clone()
                    }
                    InterceptAction::Block => {
                        let status = status.unwrap_or(418);
                        let status_text = status_text.unwrap_or_else(|| "I'm a teapot".to_string());
                        let headers = response_headers.unwrap_or_default();
                        let body = body.unwrap_or_default();

                        let response = ProxiedResponse::new(
                            status,
                            status_text,
                            "HTTP/1.1".to_string(),
                            headers,
                            Some(body),
                            chrono::Local::now().timestamp_millis(),
                        );
                        self.emit_request_complete(id, proxied_req, response, 0);
                        None
                    }
                }
            }
            _ => {
                tracing::warn!("Intercept timed out for id={}, returning 504", id);
                let response = ProxiedResponse::new(
                    504,
                    "Gateway Timeout".to_string(),
                    "HTTP/1.1".to_string(),
                    HashMap::new(),
                    None,
                    chrono::Local::now().timestamp_millis(),
                );
                self.emit_request_complete(id, proxied_req, response, 0);
                None
            }
        }
    }

    pub async fn handle_response(
        &mut self,
        status: u16,
        status_text: String,
        version: String,
        headers: HashMap<String, String>,
        body: Option<Vec<u8>>,
    ) -> Option<Vec<u8>> {
        let id = self.pending_id.take().unwrap_or_else(next_id);
        let response_body_limit = self.response_body_limit;

        let (response, body_out) = match body {
            Some(data) => {
                let capture = BodyCapture::new(response_body_limit);
                capture.append(&data);
                let snapshot = capture.snapshot();
                let _truncated = snapshot.truncated;
                let body_str = snapshot_to_string(snapshot.clone());
                let response = ProxiedResponse::new(
                    status,
                    status_text,
                    version,
                    headers,
                    body_str.clone(),
                    chrono::Local::now().timestamp_millis(),
                );
                (response, snapshot)
            }
            None => (
                ProxiedResponse::new(
                    status,
                    status_text,
                    version,
                    headers,
                    None,
                    chrono::Local::now().timestamp_millis(),
                ),
                BodySnapshot { bytes: Bytes::new(), truncated: false, total_seen: 0 },
            )
        };

        let request = self.take_captured_request();
        let _duration_ms = response.timestamp.saturating_sub(request.as_ref().map(|r| r.timestamp).unwrap_or(0)) as u64;
        let size = body_out.total_seen;

        if let Some(req) = request {
            self.emit_request_complete(id, req, response, size);
        }

        if body_out.truncated {
            tracing::warn!("Response body truncated at {} bytes after seeing {} bytes", body_out.bytes.len(), body_out.total_seen);
        }

        Some(body_out.bytes.to_vec())
    }

    pub fn handle_replayed_request(&mut self, request: ProxiedRequest) -> Option<ProxiedRequest> {
        let id = next_id();
        self.pending_id = Some(id);
        self.captured_request = Some(CapturedRequest::Buffered(request.clone()));

        if let Some(ref cfg) = self.intercept {
            if cfg.is_enabled() {
                let rx = cfg.register(id);
                let event = ProxyEvent::request_intercepted(
                    id,
                    request.clone(),
                    chrono::Local::now().timestamp_millis(),
                );
                if self.event_tx.try_send(event).is_err() {
                    cfg.resolve(id, InterceptDecision::forward());
                } else {
                    let rt = tokio::runtime::Handle::current();
                    let rx = Arc::new(parking_lot::Mutex::new(Some(rx)));
                    let mut rx_guard = rx.lock();
                    if let Some(rx) = rx_guard.take() {
                        drop(rx_guard);
                        let result = rt.block_on(async {
                            timeout(Duration::from_secs(INTERCEPT_TIMEOUT_SECS), rx).await
                        });
                        match result {
                            Ok(Ok(decision)) => {
                                return self.apply_intercept_decision(id, request, decision);
                            }
                            _ => {
                                tracing::warn!("Intercept timed out for replay id={}", id);
                            }
                        }
                    }
                }
            }
        }

        Some(request)
    }

    fn apply_intercept_decision(&mut self, id: u64, request: ProxiedRequest, decision: InterceptDecision) -> Option<ProxiedRequest> {
        match decision.action {
            InterceptAction::Forward => Some(request),
            InterceptAction::Modified => {
                let method = decision.method.unwrap_or(request.method);
                let url = decision.url.unwrap_or(request.url);
                let headers = decision.headers.unwrap_or(request.headers);
                let body = decision.body.unwrap_or_else(|| request.body.clone().unwrap_or_default());
                let path = url.split("://").nth(1).unwrap_or("/").split('/').skip(1).collect::<Vec<_>>().join("/");

                Some(ProxiedRequest::new(
                    method,
                    url,
                    path,
                    request.version,
                    headers,
                    Some(body),
                    chrono::Local::now().timestamp_millis(),
                ))
            }
            InterceptAction::Block => {
                let status = decision.status.unwrap_or(418);
                let status_text = decision.status_text.unwrap_or_else(|| "Blocked".to_string());
                let headers = decision.response_headers.unwrap_or_default();
                let body = decision.body.unwrap_or_default();

                let response = ProxiedResponse::new(
                    status,
                    status_text,
                    "HTTP/1.1".to_string(),
                    headers,
                    Some(body),
                    chrono::Local::now().timestamp_millis(),
                );
                self.emit_request_complete(id, request, response, 0);
                None
            }
        }
    }

    fn emit_request_complete(&self, id: u64, request: ProxiedRequest, response: ProxiedResponse, size: usize) {
        let duration_ms = (response.timestamp.saturating_sub(request.timestamp)) as u64;
        let event = ProxyEvent::request_complete(id, request, response, duration_ms, size);
        try_send_event(&self.event_tx, event);
    }

    pub fn send_error(&self, id: u64, message: String, stage: String, url: Option<String>) {
        let event = ProxyEvent::error(id, message, stage, url);
        try_send_event(&self.event_tx, event);
    }

    pub fn event_channel_size() -> usize {
        EVENT_CHANNEL_SIZE
    }
}

pub fn create_event_channel() -> (mpsc::Sender<ProxyEvent>, mpsc::Receiver<ProxyEvent>) {
    mpsc::channel(EVENT_CHANNEL_SIZE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_handle_request_without_intercept() {
        let (tx, _rx) = create_event_channel();
        let mut handler = CapturingHandler::new(tx);

        let result = handler.handle_request(
            "GET".to_string(),
            "https://example.com".to_string(),
            "HTTP/1.1".to_string(),
            HashMap::new(),
            Some(b"body".to_vec()),
        ).await;

        assert!(result.is_some());
        assert!(handler.captured_request.is_some());
    }

    #[tokio::test]
    async fn test_handle_response_emits_event() {
        let (tx, mut rx) = create_event_channel();
        let mut handler = CapturingHandler::new(tx);

        handler.captured_request = Some(CapturedRequest::Buffered(ProxiedRequest::new(
            "GET".to_string(),
            "https://example.com".to_string(),
            "/".to_string(),
            "HTTP/1.1".to_string(),
            HashMap::new(),
            Some("body".to_string()),
            chrono::Local::now().timestamp_millis(),
        )));
        handler.pending_id = Some(42);

        let result = handler.handle_response(
            200,
            "OK".to_string(),
            "HTTP/1.1".to_string(),
            HashMap::new(),
            Some(b"response body".to_vec()),
        ).await;

        assert!(result.is_some());
        assert!(rx.recv().await.is_some());
    }

    #[test]
    fn test_body_capture_limits() {
        let capture = BodyCapture::new(Some(4));
        capture.append(b"abcdefgh");

        let snapshot = capture.snapshot();
        assert_eq!(snapshot.bytes.as_ref(), b"abcd");
        assert!(snapshot.truncated);
        assert_eq!(snapshot.total_seen, 8);
    }
}