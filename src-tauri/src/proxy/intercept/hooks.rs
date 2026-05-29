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
    is_captive_portal(uri)
}

pub fn is_captive_portal(uri: &str) -> bool {
    CAPTIVE_PORTAL_PATTERNS
        .iter()
        .any(|pattern| uri.contains(pattern))
}
