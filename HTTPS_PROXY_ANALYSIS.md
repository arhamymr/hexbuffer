# Apprecon HTTPS Proxy Analysis

## Project Overview
Apprecon is a Tauri-based desktop proxy application for intercepting and analyzing HTTP/HTTPS traffic. It uses the Pingora Rust framework for the proxy implementation.

## Architecture

### Current Port Configuration
```
Port 8888: add_tcp (plain TCP listener) - HTTP proxy tunnel
Port 8889: add_tls_with_settings (TLS endpoint) - HTTPS MITM
```

### How HTTP Proxy Works (CONNECT Method)

```
Browser --> CONNECT example.com:80 --> Proxy (8888)
                                        |
                                   TCP tunnel opens
                                        |
Browser --> [plain HTTP over tunnel] --> Destination
```

### How HTTPS MITM Should Work (Current Broken State)

```
Browser --> CONNECT youtube.com:443 --> Proxy (8888)
                                              |
                                    Problem: 8888 is plain TCP
                                    Proxy opens direct tunnel
                                    to youtube.com:443
                                              |
Browser --> [TLS direct to YouTube] ---------> YouTube
                                              |
                                    Our TlsCertCallback on 8889
                                    NEVER FIRES
```

### How HTTPS MITM Should Work (Correct Architecture)

```
Browser --> CONNECT youtube.com:443 --> Proxy (8889 - TLS endpoint)
                                              |
                                    Browser TLS handshake WITH proxy
                                    (TlsCertCallback fires here)
                                              |
                                    Proxy forges certificate
                                    for youtube.com
                                              |
                                    Proxy TLS to YouTube
```

## Issue: Single Port Cannot Do Both

| Port Type | What It Does | Can MITM HTTPS? |
|-----------|--------------|------------------|
| `add_tcp` (plain TCP) | TCP tunnel pipe | ❌ No - just forwards bytes |
| `add_tls_with_settings` | TLS termination with callback | ✅ Yes - but only accepts TLS connections |

### The Problem in Detail

When browser uses HTTP proxy mode and sends `CONNECT youtube.com:443` to our plain TCP port (8888):

1. Browser sends: `CONNECT youtube.com:443 HTTP/1.1`
2. Pingora on 8888 interprets this as TCP tunnel request
3. Pingora opens TCP connection to youtube.com:443
4. Browser sends TLS ClientHello through the tunnel
5. TLS handshake happens **directly between browser and YouTube**
6. **Our TlsCertCallback on 8889 never fires**

### Pingora's TLS Endpoint Behavior

`add_tls_with_settings` on port 8889:
- Listens for incoming TLS connections
- When browser connects and starts TLS handshake, `TlsCertCallback.certificate_callback` fires
- We provide forged certificate for MITM
- Then proxy connects to destination with real TLS

**But browser must connect to 8889 directly with TLS, not via HTTP CONNECT through 8888.**

## The Fix Options

### Option A: Two Separate Ports (Recommended)
- Browser HTTP proxy setting: `localhost:8888` (for HTTP sites)
- Browser HTTP proxy setting: `localhost:8889` (for HTTPS sites)
- OR use browser's "HTTPS proxy" option pointing to 8889

### Option B: Browser Uses TLS Endpoint Directly
- Browser sets HTTP Proxy to `localhost:8889` (our TLS endpoint)
- For HTTP sites through 8889: CONNECT tunnel, then plain HTTP
- For HTTPS sites through 8889: TLS MITM kicks in

### Option C: Single Port Complex Routing
- Requires intercepting CONNECT and routing to different handlers
- Not supported by current pingora architecture without significant customization

## Code Locations

### Key Files
- `src/proxy/mod.rs` - Proxy configuration and setup
- `src/proxy/https/mod.rs` - TLS callback implementation
- `src/proxy/https/cert.rs` - Certificate generation
- `src/proxy/lifecycle/peer.rs` - Upstream connection handling

### Critical Code Blocks

#### Proxy Setup (mod.rs)
```rust
proxy.add_tcp(&format!("127.0.0.1:{}", config.port));  // 8888 - plain TCP
proxy.add_tls_with_settings(&format!("127.0.0.1:{}", config.tls_port), None, tls_settings);  // 8889 - TLS
```

#### TLS Callback (https/mod.rs)
```rust
async fn certificate_callback(&self, ssl: &mut TlsRef) -> () {
    let sni = ssl.servername(NameType::HOST_NAME);
    // If SNI is None, likely HTTP CONNECT - skip MITM
    // If SNI has value, this is HTTPS - do MITM
}
```

## Current Symptoms

| Request | Expected | Actual |
|---------|----------|--------|
| HTTP site (e.g., http://zero.webappsecurity.com/) | Works | ✅ Working |
| HTTPS site (e.g., https://www.youtube.com/) | MITM + logs | ❌ "Secure Connection Failed" |
| Any logs from TlsCertCallback | Should appear | ❌ None |

## Root Cause Summary

1. Browser sends `CONNECT youtube.com:443` to 8888 (plain TCP)
2. Pingora on 8888 opens TCP tunnel to YouTube
3. Browser sends TLS ClientHello directly to YouTube (through tunnel)
4. Our TLS callback on 8889 is never invoked because no connection is made to 8889
5. Browser receives YouTube's real certificate, doesn't trust it (CA not installed properly or connection bypasses proxy entirely)

## Next Steps for Fix

1. **Browser must connect to TLS endpoint (8889)** for HTTPS MITM to work
2. Browser HTTP proxy setting should be `localhost:8889`
3. OR implement proper CONNECT routing to internal TLS handler

## Testing Commands

```bash
# Test HTTP through proxy
curl -v --proxy http://localhost:8888 http://httpforever.com/

# Test HTTPS through proxy (should show MITM logs if working)
curl -v --proxy http://localhost:8889 https://httpforever.com/

# Check ports are listening
lsof -i :8888
lsof -i :8889
```