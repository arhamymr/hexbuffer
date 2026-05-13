use pingora_http::{RequestHeader, ResponseHeader};

const CAPTIVE_PORTAL_PATTERNS: &[&str] = &[
    "connectivitycheck.gstatic.com",
    "www.msftconnecttest.com",
    "connectivity-check.ubuntu.com",
    "detectportal.firefox.com",
    "captive.apple.com",
    "www.google.com/generate_204",
    "clients3.google.com/generate_204",
    "connectivitycheck.android.com",
];

pub fn should_bypass(uri: &str) -> bool {
    CAPTIVE_PORTAL_PATTERNS.iter().any(|pattern| uri.contains(pattern))
}

pub fn on_request(req: &mut RequestHeader) {
    let _ = req.insert_header("x-rusxy", "1");
}

pub fn on_response(res: &mut ResponseHeader) {
    let _ = res.insert_header("x-rusxy", "1");
}