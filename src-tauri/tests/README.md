# Bug Condition Exploration Tests

## Overview

These tests are designed to **FAIL on unfixed code (Pingora)** to confirm the bug exists. When the tests **PASS after migration to Hudsucker**, it confirms the fix works.

## Prerequisites

**CRITICAL**: The proxy must be running before executing these tests.

### Starting the Proxy

1. Open a terminal in the `src-tauri` directory
2. Run the application:
   ```bash
   cargo run
   ```
3. The proxy should start on port 8888
4. Keep this terminal open while running tests

### Running the Tests

In a **separate terminal**, run:

```bash
cd src-tauri
cargo test --lib -- --test-threads=1
```

**Note**: Use `--test-threads=1` to run tests sequentially, as they all connect to the same proxy instance.

## Expected Behavior

### On Unfixed Code (Pingora)

The tests **WILL FAIL** with messages like:

```
BUG CONFIRMED: No TLS ServerHello received. Connection is idle after CONNECT 200.
```

This is **EXPECTED** and confirms the bug exists. The failure demonstrates that:
- CONNECT requests receive "200 Connection Established" ✓
- But TLS handshake never occurs ✗
- Connection remains idle ✗

### On Fixed Code (Hudsucker)

After migration to Hudsucker, the tests **WILL PASS**, confirming:
- CONNECT requests receive "200 Connection Established" ✓
- TLS handshake completes successfully ✓
- HTTPS traffic can be decrypted and logged ✓

## Test Cases

### 1. `test_connect_tunnel_tls_upgrade_example_com`
- **Validates**: Requirements 1.1, 1.2, 1.3, 1.4
- **Target**: example.com:443
- **Expected on Pingora**: FAIL (no TLS ServerHello)
- **Expected on Hudsucker**: PASS (TLS handshake completes)

### 2. `test_connect_tunnel_tls_upgrade_httpbin`
- **Validates**: Requirements 1.1, 1.2, 1.3, 1.4
- **Target**: httpbin.org:443
- **Expected on Pingora**: FAIL (no TLS ServerHello)
- **Expected on Hudsucker**: PASS (TLS handshake completes)

### 3. `prop_connect_tunnel_requires_tls_upgrade` (Property-Based)
- **Validates**: Requirements 1.1, 1.2, 1.3, 1.4
- **Targets**: Multiple hosts (example.com, httpbin.org, google.com)
- **Expected on Pingora**: FAIL (no TLS ServerHello for any host)
- **Expected on Hudsucker**: PASS (TLS handshake completes for all hosts)

## Troubleshooting

### "Failed to connect to proxy"
- Ensure the proxy is running on port 8888
- Check that no other service is using port 8888
- Verify the proxy started successfully (check terminal output)

### "Connection timeout"
- This is expected on Pingora (confirms the bug)
- The connection sits idle after CONNECT 200
- This is the bug we're fixing

### "Address already in use"
- Another instance of the proxy is running
- Kill the other instance or use a different port
- Update the test proxy address if using a different port

## Next Steps

After documenting the test failures on Pingora:
1. Proceed to Phase 2: Write preservation property tests
2. Implement the migration to Hudsucker (Phases 3-7)
3. Re-run these tests to verify the fix works
4. Verify preservation tests still pass (no regressions)
