use crate::packet_capture::types::CapturedPacketEvent;
use regex::Regex;

pub fn parse_tcpdump_line(
    line: &str,
    packet_number: &std::sync::atomic::AtomicU64,
) -> Option<CapturedPacketEvent> {
    let trimmed = line.trim();

    if trimmed.is_empty() {
        return None;
    }

    let regex = Regex::new(
        r"^(?P<ts>\d+(?:\.\d+)?)\s+(?P<proto>IP6?|ARP|ICMP|UDP|TCP)\s+(?P<src>\S+)\s+>\s+(?P<dst>\S+):\s*(?P<info>.*)$",
    )
    .ok()?;
    let number = packet_number.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;

    if let Some(captures) = regex.captures(trimmed) {
        let timestamp = captures.name("ts")?.as_str().parse::<f64>().ok()?;
        let source = captures.name("src")?.as_str();
        let destination = captures.name("dst")?.as_str();
        let info = captures
            .name("info")
            .map(|value| value.as_str().to_string())
            .unwrap_or_default();
        let (source_ip, source_port) = split_endpoint(source);
        let (destination_ip, destination_port) = split_endpoint(destination);
        let length = parse_length(&info);
        let protocol = infer_protocol(
            captures.name("proto")?.as_str(),
            source_port,
            destination_port,
            &info,
        );

        return Some(CapturedPacketEvent {
            id: format!("live-{number}"),
            number,
            timestamp,
            source_ip,
            destination_ip,
            protocol,
            source_port,
            destination_port,
            length,
            info,
            raw_line: line.to_string(),
        });
    }

    let timestamp = trimmed
        .split_whitespace()
        .next()
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or(number as f64);
    let protocol = infer_raw_protocol(trimmed);

    Some(CapturedPacketEvent {
        id: format!("live-{number}"),
        number,
        timestamp,
        source_ip: "-".to_string(),
        destination_ip: "-".to_string(),
        protocol,
        source_port: None,
        destination_port: None,
        length: trimmed.len(),
        info: trimmed.to_string(),
        raw_line: line.to_string(),
    })
}

pub fn split_endpoint(endpoint: &str) -> (String, Option<u16>) {
    let trimmed = endpoint.trim_end_matches(':');

    if let Some((host, port)) = trimmed.rsplit_once('.') {
        if let Ok(port) = port.parse::<u16>() {
            return (host.to_string(), Some(port));
        }
    }

    (trimmed.to_string(), None)
}

pub fn infer_protocol(
    base_protocol: &str,
    source_port: Option<u16>,
    destination_port: Option<u16>,
    info: &str,
) -> String {
    if base_protocol == "ARP" {
        return "ARP".to_string();
    }

    if info.contains("ICMP") || base_protocol == "ICMP" {
        return "ICMP".to_string();
    }

    if source_port == Some(53) || destination_port == Some(53) {
        return "DNS".to_string();
    }

    if source_port == Some(443) || destination_port == Some(443) {
        return "TLS".to_string();
    }

    if matches!(source_port, Some(80 | 8080 | 8000))
        || matches!(destination_port, Some(80 | 8080 | 8000))
    {
        return "HTTP".to_string();
    }

    if info.contains("Flags") {
        return "TCP".to_string();
    }

    base_protocol.to_string()
}

pub fn infer_raw_protocol(line: &str) -> String {
    let lower = line.to_lowercase();

    if lower.contains("802.11")
        || lower.contains("beacon")
        || lower.contains("probe")
        || lower.contains("ack")
        || lower.contains("rts")
        || lower.contains("cts")
        || lower.contains("data")
    {
        return "802.11".to_string();
    }

    if lower.contains(" arp ") || lower.starts_with("arp") {
        return "ARP".to_string();
    }

    if lower.contains(" udp ") {
        return "UDP".to_string();
    }

    if lower.contains(" tcp ") || lower.contains("flags") {
        return "TCP".to_string();
    }

    "OTHER".to_string()
}

fn parse_length(info: &str) -> usize {
    let regex = Regex::new(r"length\s+(\d+)").ok();

    regex
        .and_then(|pattern| {
            pattern
                .captures_iter(info)
                .last()
                .and_then(|captures| captures.get(1))
                .and_then(|value| value.as_str().parse::<usize>().ok())
        })
        .unwrap_or(0)
}
