use std::collections::HashMap;
use std::sync::{atomic::AtomicBool, Arc, Mutex};

#[derive(Default)]
pub struct PortScanState {
    pub cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}
