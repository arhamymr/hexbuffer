use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

pub async fn grab_banner(
    host: &str,
    stream: &mut TcpStream,
    port: u16,
    timeout_ms: u64,
) -> Option<String> {
    if matches!(port, 443 | 8443) {
        return grab_https_banner(host, port, timeout_ms).await;
    }

    let probe_data;
    let probe = match port {
        80 | 8000 | 8080 | 8081 | 8888 | 9000 => {
            probe_data = format!(
                "HEAD / HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
                host
            );
            Some(probe_data.as_bytes())
        }
        25 | 587 => Some(b"EHLO 0xbuffer.local\r\n".as_slice()),
        110 => Some(b"CAPA\r\n".as_slice()),
        143 => Some(b"a001 CAPABILITY\r\n".as_slice()),
        _ => None,
    };

    if let Some(probe) = probe {
        let _ = tokio::time::timeout(
            Duration::from_millis(timeout_ms.min(1_000)),
            stream.write_all(probe),
        )
        .await;
    }

    let mut buffer = vec![0; 1024];
    match tokio::time::timeout(
        Duration::from_millis(timeout_ms.min(1_500)),
        stream.read(&mut buffer),
    )
    .await
    {
        Ok(Ok(0)) | Ok(Err(_)) | Err(_) => None,
        Ok(Ok(size)) => summarize_banner(port, &sanitize_banner(&buffer[..size])),
    }
}

async fn grab_https_banner(host: &str, port: u16, timeout_ms: u64) -> Option<String> {
    let url = format!("https://{}:{}/", host, port);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms.min(2_500)))
        .danger_accept_invalid_certs(true)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .ok()?;

    let response = client.head(url).send().await.ok()?;
    let mut parts = vec![format!(
        "HTTP/{} {} {}",
        http_version(response.version()),
        response.status().as_u16(),
        response.status().canonical_reason().unwrap_or_default()
    )];

    if let Some(server) = response.headers().get(reqwest::header::SERVER) {
        if let Ok(server) = server.to_str() {
            parts.push(format!("Server: {}", server));
        }
    }

    if let Some(powered_by) = response.headers().get("x-powered-by") {
        if let Ok(powered_by) = powered_by.to_str() {
            parts.push(format!("X-Powered-By: {}", powered_by));
        }
    }

    Some(parts.join("; "))
}

fn sanitize_banner(bytes: &[u8]) -> String {
    let raw = String::from_utf8_lossy(bytes);
    // Normalize line endings to \n, strip other control chars
    let cleaned: String = raw
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .chars()
        .map(|ch| {
            if ch.is_control() && ch != '\n' && ch != '\t' {
                ' '
            } else {
                ch
            }
        })
        .collect();

    // Keep at most 5 lines, then join with "; " for a compact single-line banner
    let lines: Vec<&str> = cleaned.lines().take(5).collect();
    let joined = lines.join("; ");
    joined.trim().chars().take(500).collect()
}

fn summarize_banner(port: u16, banner: &str) -> Option<String> {
    let banner = banner.trim();
    if banner.is_empty() {
        return None;
    }

    if banner.starts_with("HTTP/") {
        return Some(summarize_http_banner(banner));
    }

    let first_line = banner
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();
    if first_line.is_empty() {
        None
    } else if matches!(port, 21 | 22 | 25 | 110 | 143 | 587) {
        Some(first_line)
    } else {
        Some(first_line.chars().take(160).collect())
    }
}

fn summarize_http_banner(banner: &str) -> String {
    let mut parts = Vec::new();
    let mut server = None;
    let mut powered_by = None;
    let mut location = None;

    for (index, segment) in banner.split(';').enumerate() {
        let segment = segment.trim();
        if index == 0 {
            parts.push(segment.to_string());
            continue;
        }

        let lower = segment.to_ascii_lowercase();
        if lower.starts_with("server:") {
            server = Some(segment.to_string());
        } else if lower.starts_with("x-powered-by:") {
            powered_by = Some(segment.to_string());
        } else if lower.starts_with("location:") {
            location = Some(segment.to_string());
        }
    }

    parts.extend(server);
    parts.extend(powered_by);
    parts.extend(location);
    parts.join("; ")
}

fn http_version(version: reqwest::Version) -> &'static str {
    match version {
        reqwest::Version::HTTP_09 => "0.9",
        reqwest::Version::HTTP_10 => "1.0",
        reqwest::Version::HTTP_11 => "1.1",
        reqwest::Version::HTTP_2 => "2",
        reqwest::Version::HTTP_3 => "3",
        _ => "?",
    }
}
