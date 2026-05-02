use std::collections::HashMap;
use tokio::io::AsyncReadExt;
use tokio::net::TcpStream;

pub fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64
}

pub fn rand_id() -> String {
    format!("{:x}", now_ms() % 0xffffff)
}

pub fn parse_url(url: &str) -> (String, String) {
    if let Some(start) = url.find("://") {
        let after = &url[start + 3..];
        let path_start = after.find('/').unwrap_or(after.len());
        (after[..path_start].to_string(), after[path_start..].to_string())
    } else { (url.to_string(), "/".to_string()) }
}

pub fn parse_headers(lines: &[&str]) -> HashMap<String, String> {
    let mut headers = HashMap::new();
    for line in lines.iter().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() { break; }
        if let Some((k, v)) = trimmed.split_once(':') {
            headers.insert(k.trim().to_lowercase(), v.trim().to_string());
        }
    }
    headers
}

pub fn parse_query_params(url: &str) -> HashMap<String, String> {
    let mut params = HashMap::new();
    if let Some(query_start) = url.find('?') {
        for pair in url[query_start + 1..].split('&') {
            if let Some((k, v)) = pair.split_once('=') {
                params.insert(url_decode(k), url_decode(v));
            } else if !pair.is_empty() { params.insert(url_decode(pair), String::new()); }
        }
    }
    params
}

pub fn url_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' { if let Ok(byte) = u8::from_str_radix(&chars.by_ref().take(2).collect::<String>(), 16) { result.push(byte as char); } }
        else if c == '+' { result.push(' '); } else { result.push(c); }
    }
    result
}

pub fn parse_cookie_str(header: &str) -> HashMap<String, String> {
    let mut cookies = HashMap::new();
    for pair in header.split(';') { if let Some((k, v)) = pair.trim().split_once('=') { cookies.insert(k.trim().to_string(), v.trim().to_string()); } }
    cookies
}

pub fn extract_cookies(headers: &HashMap<String, String>) -> HashMap<String, String> {
    let mut cookies = HashMap::new();
    if let Some(sc) = headers.get("set-cookie") {
        for part in sc.split(',') { if let Some((k, v)) = part.trim().split_once('=') { cookies.insert(k.trim().to_string(), v.split(';').next().unwrap_or("").trim().to_string()); } }
    }
    cookies
}

pub fn parse_response(buf: &[u8]) -> (u16, String, HashMap<String, String>, Option<String>, Option<String>) {
    let mut status = 0u16;
    let mut status_text = String::new();
    let mut headers = HashMap::new();
    let mut ct = None;

    if let Some(header_end) = find_header_end(buf) {
        let header_slice = &buf[..header_end];
        let header_str = String::from_utf8_lossy(header_slice);

        if let Some(first_line_end) = header_str.find('\n') {
            let status_line = &header_str[..first_line_end];
            let parts: Vec<&str> = status_line.split_whitespace().collect();
            if parts.len() >= 2 {
                status = parts[1].parse().unwrap_or(0);
                status_text = parts.get(2).unwrap_or(&"").to_string();
            }
        }

        for line in header_str.lines().skip(1) {
            let line = line.trim_end();
            if line.is_empty() { break; }
            if let Some((k, v)) = line.split_once(':') {
                let kl = k.trim().to_lowercase();
                if kl == "content-type" { ct = Some(v.trim().to_string()); }
                headers.insert(kl, v.trim().to_string());
            }
        }

        let body = if header_end < buf.len() {
            let body_bytes = &buf[header_end..];
            if !body_bytes.is_empty() { Some(String::from_utf8_lossy(body_bytes).to_string()) } else { None }
        } else { None };

        return (status, status_text, headers, body, ct);
    }

    (status, status_text, headers, None, ct)
}

pub fn find_header_end(buffer: &[u8]) -> Option<usize> {
    for i in 0..buffer.len().saturating_sub(3) {
        if buffer[i] == b'\r' && buffer[i+1] == b'\n' && buffer[i+2] == b'\r' && buffer[i+3] == b'\n' { return Some(i + 4); }
    }
    None
}

fn parse_content_length(headers_data: &[u8]) -> Option<usize> {
    let headers_str = String::from_utf8_lossy(headers_data);
    for line in headers_str.lines() { let lower = line.to_lowercase(); if lower.starts_with("content-length:") { return lower.trim_start_matches("content-length:").trim().parse().ok(); } }
    None
}

fn parse_transfer_encoding(headers_data: &[u8]) -> Option<String> {
    let headers_str = String::from_utf8_lossy(headers_data);
    for line in headers_str.lines() { let lower = line.to_lowercase(); if lower.starts_with("transfer-encoding:") { return Some(lower.trim_start_matches("transfer-encoding:").trim().to_string()); } }
    None
}

pub async fn read_request(stream: &mut TcpStream, initial: &[u8]) -> Result<Vec<u8>, std::io::Error> { read_until_complete(stream, initial, 8192).await }
pub async fn read_response(stream: &mut TcpStream) -> Result<Vec<u8>, std::io::Error> { read_until_complete(stream, &[], 16384).await }

async fn read_until_complete(stream: &mut TcpStream, initial: &[u8], chunk_size: usize) -> Result<Vec<u8>, std::io::Error> {
    let mut buffer = initial.to_vec();
    loop {
        if let Some(header_end) = find_header_end(&buffer) {
            let cl = parse_content_length(&buffer[..header_end]);
            let te = parse_transfer_encoding(&buffer[..header_end]);

            if let Some(len) = cl {
                let body_end = header_end + len;
                if buffer.len() >= body_end { buffer.truncate(body_end); return Ok(buffer); }
                while buffer.len() < body_end {
                    let mut add = vec![0u8; body_end - buffer.len()];
                    let n = AsyncReadExt::read(stream, &mut add).await?;
                    if n == 0 { return Ok(buffer); }
                    buffer.extend_from_slice(&add[..n]);
                }
                return Ok(buffer);
            } else if let Some(ref enc) = te {
                if enc.to_lowercase().contains("chunked") { return read_chunked(stream, &buffer, header_end).await; }
                return Ok(buffer);
            } else { return Ok(buffer); }
        }

        let mut add = vec![0u8; chunk_size];
        let n = AsyncReadExt::read(stream, &mut add).await?;
        if n == 0 { return Ok(buffer); }
        buffer.extend_from_slice(&add[..n]);
    }
}

async fn read_chunked(stream: &mut TcpStream, buffer: &[u8], header_end: usize) -> Result<Vec<u8>, std::io::Error> {
    let mut result = buffer[..header_end].to_vec();
    let mut body = buffer[header_end..].to_vec();

    loop {
        if let Some(pos) = find_chunk_end(&body) {
            let (size_str, remaining) = (|| {
                let mut split = None;
                for i in 0..body[..pos].len().saturating_sub(1) { if body[i] == b'\r' && body[i+1] == b'\n' { split = Some(i); break; } }
                split.map(|s| (&body[..s], &body[s+2..]))
            })().unwrap_or((&[] as &[u8], &[] as &[u8]));

            if let Ok(size) = parse_hex(size_str) {
                if size == 0 { result.extend_from_slice(remaining); return Ok(result); }
                let data_start = remaining.len() - (body.len() - pos);
                if body.len() >= pos + size + 4 {
                    result.extend_from_slice(&body[data_start..data_start + size]);
                    body = body[data_start + size + 4..].to_vec();
                    continue;
                }
            }
            return Ok(result);
        }

        let mut add = vec![0u8; 16384];
        let n = AsyncReadExt::read(stream, &mut add).await?;
        if n == 0 { return Ok(result); }
        body.extend_from_slice(&add[..n]);
    }
}

fn find_chunk_end(buffer: &[u8]) -> Option<usize> {
    for i in 0..buffer.len().saturating_sub(4) {
        if buffer[i] == b'\r' && buffer[i+1] == b'\n' && buffer[i+2] == b'0' && buffer[i+3] == b'\r' { return Some(i); }
    }
    for i in 0..buffer.len().saturating_sub(4) {
        if buffer[i] == b'\r' && buffer[i+1] == b'\n' && is_hex(buffer[i+2]) && is_hex(buffer[i+3]) {
            let mut j = i + 2;
            while j < buffer.len() && is_hex(buffer[j]) { j += 1; }
            if j + 2 < buffer.len() && buffer[j] == b'\r' && buffer[j+1] == b'\n' { return Some(i); }
        }
    }
    None
}

fn parse_hex(data: &[u8]) -> Result<usize, std::num::ParseIntError> { usize::from_str_radix(String::from_utf8_lossy(data).trim(), 16) }
fn is_hex(b: u8) -> bool { (b >= b'0' && b <= b'9') || (b >= b'a' && b <= b'f') || (b >= b'A' && b <= b'F') }