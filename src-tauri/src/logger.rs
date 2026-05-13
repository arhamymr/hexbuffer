use chrono::Local;
use colored::*;

use crate::state::ProxyRecord;

fn method_color(m: &str) -> ColoredString {
    match m {
        "GET" => format!("{m:6}").bright_green().bold(),
        "POST" => format!("{m:6}").bright_yellow().bold(),
        "PUT" => format!("{m:6}").bright_blue().bold(),
        "PATCH" => format!("{m:6}").bright_cyan().bold(),
        "DELETE" => format!("{m:6}").bright_red().bold(),
        _ => format!("{m:6}").white().bold(),
    }
}

pub fn log_body(label: &str, body: &[u8]) {
    if body.is_empty() { return; }
    let preview = String::from_utf8_lossy(body);
    let trimmed = preview.trim();
    let display = if trimmed.len() > 300 {
        format!("{}…", &trimmed[..300])
    } else {
        trimmed.to_string()
    };
    println!("  {} ({} bytes) {}", label.yellow(), body.len(), display.dimmed());
    println!("{}", "─".repeat(72).dimmed());
}

pub fn log_request_body(record: &ProxyRecord) {
    let req = &record.request;
    let res = record.response.as_ref();
    let ts = Local::now().format("%H:%M:%S%.3f");

    let method = req.method.as_str();
    let host = req.headers.get("host").map(|v| v.as_str()).unwrap_or("-");
    let path = req.uri.split('?').next().unwrap_or("/");

    println!("{} {} {}", format!("[{ts}]").dimmed(), method_color(method), format!("{host}{path}").white());

    if let Some(r) = res {
        println!("  {} {} {}", "←".cyan(), r.status_code.to_string().green().bold(), r.status_text.yellow());
    }

    println!("{}", "─".repeat(72).dimmed());
}