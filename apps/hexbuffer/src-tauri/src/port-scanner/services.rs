pub fn service_name(port: u16) -> &'static str {
    match port {
        20 => "ftp-data",
        21 => "ftp",
        22 => "ssh",
        23 => "telnet",
        25 => "smtp",
        53 => "dns",
        67 => "dhcp",
        68 => "dhcp",
        69 => "tftp",
        80 => "http",
        110 => "pop3",
        111 => "rpcbind",
        119 => "nntp",
        123 => "ntp",
        135 => "msrpc",
        137 => "netbios-ns",
        138 => "netbios-dgm",
        139 => "netbios-ssn",
        143 => "imap",
        161 => "snmp",
        162 => "snmptrap",
        389 => "ldap",
        443 => "https",
        445 => "microsoft-ds",
        465 => "smtps",
        514 => "syslog",
        587 => "submission",
        631 => "ipp",
        636 => "ldaps",
        873 => "rsync",
        993 => "imaps",
        995 => "pop3s",
        1433 => "mssql",
        1521 => "oracle",
        1723 => "pptp",
        2049 => "nfs",
        2375 => "docker",
        2376 => "docker-tls",
        3000 => "dev-http",
        3306 => "mysql",
        3389 => "rdp",
        5000 => "upnp",
        5432 => "postgresql",
        5601 => "kibana",
        5900 => "vnc",
        5985 => "winrm",
        5986 => "winrm-https",
        6379 => "redis",
        8000 => "http-alt",
        8080 => "http-proxy",
        8443 => "https-alt",
        8888 => "http-alt",
        9000 => "cslistener",
        9200 => "elasticsearch",
        9300 => "elasticsearch",
        11211 => "memcached",
        27017 => "mongodb",
        _ => "unknown",
    }
}

pub fn detect_service(port: u16, banner: Option<&str>) -> &'static str {
    let Some(banner) = banner.map(|value| value.to_ascii_lowercase()) else {
        return service_name(port);
    };

    if banner.contains("ssh-") {
        "ssh"
    } else if banner.contains("http/") || banner.contains("<html") {
        if port == 443 || port == 8443 {
            "https"
        } else {
            "http"
        }
    } else if banner.contains("smtp") || banner.contains("esmtp") {
        "smtp"
    } else if banner.contains("mysql") {
        "mysql"
    } else if banner.contains("postgresql") {
        "postgresql"
    } else if banner.contains("redis") {
        "redis"
    } else if banner.contains("mongodb") {
        "mongodb"
    } else if banner.contains("ftp") {
        "ftp"
    } else {
        service_name(port)
    }
}
