# Updater Setup — Cloudflare R2

This guide walks through setting up Cloudflare R2 as the update server for the Tauri updater plugin.

---

## 1. Create an R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Create bucket**
2. Name it `releases` (or any name you prefer)
3. Leave default settings (Standard storage class, no bucket lock)
4. Click **Create bucket**

---

## 2. Get R2 Credentials

1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Give it a name (e.g. `0xbuffer-releases`)
4. Set permissions: **Object Read & Write**
5. **Copy the Access Key ID and Secret Access Key** — you won't see the secret again

---

## 3. Make Bucket Public (Custom Domain)

**Option A — Custom Domain** (recommended):

1. In R2 → your bucket → **Settings** → **Public access** → **Custom Domains**
2. Connect a domain (e.g. `releases.0xbuffer.com`)
3. Add the DNS record Cloudflare gives you

**Option B — `r2.dev` subdomain** (testing only):

1. In R2 → your bucket → **Settings** → **Public access**
2. Enable **R2.dev subdomain**
3. Your public URL will be: `https://pub-<hash>.r2.dev`

---

## 4. Set Environment Variables

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`) or export before each build:

```bash
export R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
export R2_BUCKET="releases"
export AWS_ACCESS_KEY_ID="<your-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<your-secret-access-key>"
export UPDATER_BASE_URL="https://dist.0xbuffer.com"
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/0xbuffer.key)"
```

| Variable | Description |
|---|---|
| `R2_ENDPOINT` | Found in R2 dashboard → your bucket → **Configuration** → copy the S3 API endpoint |
| `R2_BUCKET` | Your bucket name |
| `AWS_ACCESS_KEY_ID` | From the API token you created in step 2 |
| `AWS_SECRET_ACCESS_KEY` | From the API token you created in step 2 |
| `UPDATER_BASE_URL` | Your public domain (e.g. `https://dist.0xbuffer.com`) or `r2.dev` URL |
| `TAURI_SIGNING_PRIVATE_KEY` | Path to your private signing key |

---

## 5. Update tauri.conf.json

Set the endpoint in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "<your-public-key>",
      "endpoints": [
        "https://dist.0xbuffer.com/latest.json"
      ]
    }
  }
}
```

Replace `dist.0xbuffer.com` with your actual domain or `r2.dev` URL.

---

## 6. Build & Upload

```bash
./build.sh
```

The script will:
1. Build the Tauri app (generates `.sig` signatures)
2. Detect your platform (`darwin-aarch64`, `windows-x86_64`, etc.)
3. Upload the updater bundle + signature to R2
4. Generate/update `latest.json` with all platform entries

---

## 7. Verify

Visit your endpoint URL in a browser:

```
https://dist.0xbuffer.com/latest.json
```

You should see:

```json
{
  "version": "0.1.0",
  "notes": "",
  "pub_date": "2026-05-30T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVk...",
      "url": "https://dist.0xbuffer.com/0xbuffer_0.1.0_aarch64.dmg"
    }
  }
}
```

---

## 8. Multi-Platform Builds

Build on each platform separately, then re-run the upload. The script merges entries into the same `latest.json`:

```bash
# macOS (Apple Silicon)
./build.sh   # adds darwin-aarch64

# macOS (Intel)
./build.sh   # adds darwin-x86_64

# Windows
./build.sh   # adds windows-x86_64

# Linux
./build.sh   # adds linux-x86_64
```

---

## Notes

- The updater enforces HTTPS in production — make sure your endpoint uses a valid SSL certificate
- Set `UPDATER_NOTES` to include release notes: `export UPDATER_NOTES="Fixed crash on startup"`
- For local testing, set `"dangerousInsecureTransportProtocol": true` in the updater config and use HTTP
