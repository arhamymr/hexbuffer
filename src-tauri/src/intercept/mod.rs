mod hooks;

pub use hooks::{on_request, on_response, should_bypass};
pub use crate::state::{
    add_paused_request, disable_intercept, enable_intercept, get_all_paused,
    get_mode, get_paused_request, get_status, remove_paused_request, InterceptMode,
    InterceptStatus, PausedRequest, ProxyRecord, ProxyRequest, ProxyResponse, PROXY_STORE,
};