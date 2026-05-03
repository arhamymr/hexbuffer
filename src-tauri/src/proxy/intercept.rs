use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::oneshot;

use super::types::InterceptDecision;

pub type PendingMap = Mutex<HashMap<u64, oneshot::Sender<InterceptDecision>>>;

pub struct InterceptConfig {
    enabled: Arc<AtomicBool>,
    pending: PendingMap,
}

impl Clone for InterceptConfig {
    fn clone(&self) -> Self {
        Self {
            enabled: self.enabled.clone(),
            pending: Mutex::new(HashMap::new()),
        }
    }
}

impl InterceptConfig {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            enabled: Arc::new(AtomicBool::new(false)),
            pending: Mutex::new(HashMap::new()),
        })
    }

    #[inline]
    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::Relaxed)
    }

    pub fn set_enabled(&self, v: bool) {
        let prev = self.enabled.swap(v, Ordering::SeqCst);
        if prev && !v {
            self.drain_forward();
        }
    }

    pub fn toggle(&self) -> bool {
        let prev = self.enabled.fetch_xor(true, Ordering::SeqCst);
        let new_state = !prev;
        if !new_state {
            self.drain_forward();
        }
        new_state
    }

    pub fn register(&self, id: u64) -> oneshot::Receiver<InterceptDecision> {
        let (tx, rx) = oneshot::channel();
        self.pending.lock().unwrap().insert(id, tx);
        rx
    }

    pub fn resolve(&self, id: u64, decision: InterceptDecision) -> bool {
        if let Some(tx) = self.pending.lock().unwrap().remove(&id) {
            let _ = tx.send(decision);
            true
        } else {
            false
        }
    }

    pub fn pending_count(&self) -> usize {
        self.pending.lock().unwrap().len()
    }

    fn drain_forward(&self) {
        let mut map = self.pending.lock().unwrap();
        for (_, tx) in map.drain() {
            let _ = tx.send(InterceptDecision::forward());
        }
    }
}

impl Default for InterceptConfig {
    fn default() -> Self {
        Self {
            enabled: Arc::new(AtomicBool::new(false)),
            pending: Mutex::new(HashMap::new()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_disabled() {
        let cfg = InterceptConfig::new();
        assert!(!cfg.is_enabled());
        assert_eq!(cfg.pending_count(), 0);
    }

    #[test]
    fn test_toggle() {
        let cfg = InterceptConfig::new();
        assert!(cfg.toggle());
        assert!(cfg.is_enabled());
        assert!(!cfg.toggle());
        assert!(!cfg.is_enabled());
    }

    #[test]
    fn test_register_resolve_forward() {
        let cfg = InterceptConfig::new();
        let mut rx = cfg.register(1);
        assert_eq!(cfg.pending_count(), 1);
        assert!(cfg.resolve(1, InterceptDecision::forward()));
        assert_eq!(cfg.pending_count(), 0);
    }

    #[test]
    fn test_resolve_unknown_id() {
        let cfg = InterceptConfig::new();
        assert!(!cfg.resolve(99, InterceptDecision::forward()));
    }

    #[test]
    fn test_drain_forward_on_toggle_off() {
        let cfg = InterceptConfig::new();
        cfg.toggle();
        let mut rx1 = cfg.register(1);
        let mut rx2 = cfg.register(2);
        assert_eq!(cfg.pending_count(), 2);
        cfg.toggle();
        assert_eq!(cfg.pending_count(), 0);
    }
}