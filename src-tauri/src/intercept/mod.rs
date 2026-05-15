mod hooks;

pub use hooks::{on_request, on_response, should_bypass};
pub use crate::state::{
    InterceptMode, InterceptStatus, PausedRequest, ProxyRecord, ProxyRequest, ProxyResponse,
};