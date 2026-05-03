use bytes::{Bytes, BytesMut};
use std::sync::{Arc, Mutex};

#[derive(Clone, Debug)]
pub struct BodyCapture {
    inner: Arc<Mutex<BodyCaptureState>>,
    limit: Option<usize>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BodySnapshot {
    pub bytes: Bytes,
    pub truncated: bool,
    pub total_seen: usize,
}

#[derive(Debug)]
struct BodyCaptureState {
    bytes: BytesMut,
    truncated: bool,
    total_seen: usize,
}

impl BodyCapture {
    pub fn new(limit: Option<usize>) -> Self {
        Self {
            inner: Arc::new(Mutex::new(BodyCaptureState {
                bytes: BytesMut::new(),
                truncated: false,
                total_seen: 0,
            })),
            limit,
        }
    }

    pub fn append(&self, chunk: &[u8]) {
        let mut state = self.inner.lock().unwrap();
        state.total_seen = state.total_seen.saturating_add(chunk.len());

        if let Some(limit) = self.limit {
            let remaining = limit.saturating_sub(state.bytes.len());
            if remaining > 0 {
                let keep = remaining.min(chunk.len());
                state.bytes.extend_from_slice(&chunk[..keep]);
            }
            if chunk.len() > remaining {
                state.truncated = true;
            }
        } else {
            state.bytes.extend_from_slice(chunk);
        }
    }

    pub fn snapshot(&self) -> BodySnapshot {
        let state = self.inner.lock().unwrap();
        BodySnapshot {
            bytes: Bytes::copy_from_slice(&state.bytes),
            truncated: state.truncated,
            total_seen: state.total_seen,
        }
    }

    pub fn is_truncated(&self) -> bool {
        let state = self.inner.lock().unwrap();
        state.truncated
    }

    pub fn total_seen(&self) -> usize {
        let state = self.inner.lock().unwrap();
        state.total_seen
    }
}

pub const DEFAULT_REQUEST_BODY_LIMIT: Option<usize> = Some(1024 * 1024);
pub const DEFAULT_RESPONSE_BODY_LIMIT: Option<usize> = Some(2 * 1024 * 1024);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_body_capture_with_limit() {
        let capture = BodyCapture::new(Some(4));
        capture.append(b"abcdef");

        let snapshot = capture.snapshot();
        assert_eq!(snapshot.bytes.as_ref(), b"abcd");
        assert!(snapshot.truncated);
        assert_eq!(snapshot.total_seen, 6);
    }

    #[test]
    fn test_body_capture_unlimited() {
        let capture = BodyCapture::new(None);
        capture.append(b"abcdef");

        let snapshot = capture.snapshot();
        assert_eq!(snapshot.bytes.as_ref(), b"abcdef");
        assert!(!snapshot.truncated);
        assert_eq!(snapshot.total_seen, 6);
    }

    #[test]
    fn test_body_snapshot_clone() {
        let capture = BodyCapture::new(Some(4));
        capture.append(b"abcdef");

        let snapshot1 = capture.snapshot();
        let snapshot2 = snapshot1.clone();
        assert_eq!(snapshot1.bytes, snapshot2.bytes);
    }
}