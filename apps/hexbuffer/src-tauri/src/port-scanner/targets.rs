use std::collections::BTreeSet;

pub fn expand_targets(input: &str) -> Result<Vec<String>, String> {
    let trimmed = input.trim();
    if !trimmed.contains("://") {
        if let Some((base, prefix)) = trimmed.split_once('/') {
            let base = normalize_scan_host(base)?;
            return expand_ipv4_cidr(&base, prefix);
        }
    }

    let target = normalize_scan_host(input)?;
    Ok(vec![target])
}

pub fn normalize_scan_ports(ports: Vec<u16>) -> Result<Vec<u16>, String> {
    let ports = ports.into_iter().collect::<BTreeSet<_>>();
    if ports.is_empty() {
        return Err("At least one port is required".to_string());
    }
    Ok(ports.into_iter().collect())
}

fn normalize_scan_host(input: &str) -> Result<String, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Host is required".to_string());
    }

    let parsed = if trimmed.contains("://") {
        url::Url::parse(trimmed)
            .ok()
            .and_then(|url| url.host_str().map(|host| host.to_string()))
    } else {
        Some(
            trimmed
                .split('/')
                .next()
                .unwrap_or_default()
                .trim()
                .trim_start_matches('[')
                .trim_end_matches(']')
                .to_string(),
        )
    };

    let host = parsed
        .unwrap_or_default()
        .split('@')
        .last()
        .unwrap_or_default()
        .split(':')
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();

    if host.is_empty() {
        return Err("Host is required".to_string());
    }

    Ok(host)
}

fn expand_ipv4_cidr(base: &str, prefix: &str) -> Result<Vec<String>, String> {
    let prefix = prefix
        .parse::<u32>()
        .map_err(|_| "CIDR prefix must be a number".to_string())?;
    if prefix > 32 {
        return Err("CIDR prefix must be between 0 and 32".to_string());
    }

    let ip = parse_ipv4(base)?;
    let mask = if prefix == 0 {
        0
    } else {
        u32::MAX << (32 - prefix)
    };
    let network = ip & mask;
    let broadcast = network | !mask;
    let first = if prefix < 31 { network + 1 } else { network };
    let last = if prefix < 31 {
        broadcast - 1
    } else {
        broadcast
    };

    if last < first {
        return Err("CIDR range does not contain scan targets".to_string());
    }

    let count = (last - first + 1) as usize;
    if count > 4096 {
        return Err("CIDR scans are limited to 4,096 hosts".to_string());
    }

    Ok((first..=last).map(format_ipv4).collect())
}

fn parse_ipv4(input: &str) -> Result<u32, String> {
    let octets = input
        .split('.')
        .map(|part| part.parse::<u8>())
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "CIDR scanning currently supports IPv4 targets only".to_string())?;
    if octets.len() != 4 {
        return Err("CIDR scanning currently supports IPv4 targets only".to_string());
    }

    Ok(((octets[0] as u32) << 24)
        | ((octets[1] as u32) << 16)
        | ((octets[2] as u32) << 8)
        | octets[3] as u32)
}

fn format_ipv4(ip: u32) -> String {
    format!(
        "{}.{}.{}.{}",
        (ip >> 24) & 0xff,
        (ip >> 16) & 0xff,
        (ip >> 8) & 0xff,
        ip & 0xff
    )
}
