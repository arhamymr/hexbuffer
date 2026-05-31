#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "[env] .env not found; continuing with shell environment only"
fi

APP_NAME="0xbuffer"
VERSION="$(cat VERSION)"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BASE_URL="${UPDATER_BASE_URL:-https://releases.0xbuffer.com}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Platform detection ───────────────────────────────────────────────

detect_platform() {
  local os arch
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch=$(uname -m)
  case "$os" in
    darwin)  os="darwin" ;;
    linux)   os="linux" ;;
    mingw*|msys*|cygwin*) os="windows" ;;
  esac
  case "$arch" in
    x86_64|amd64) arch="x86_64" ;;
    aarch64|arm64) arch="aarch64" ;;
  esac
  echo "$os-$arch"
}

PLATFORM=$(detect_platform)

SRC_DIR="src-tauri/target/release/bundle"
BUNDLE_DIR=""
BUNDLE_EXT=""
INSTALLER_DIR=""
INSTALLER_GLOB=""

case "$(uname -s)" in
  Darwin)
    BUNDLE_DIR="$SRC_DIR/macos"
    BUNDLE_EXT=".app.tar.gz"
    INSTALLER_DIR="$SRC_DIR/dmg"
    INSTALLER_GLOB="*.dmg"
    ;;
  Linux)
    BUNDLE_DIR="$SRC_DIR/appimage"
    BUNDLE_EXT=".AppImage"
    INSTALLER_DIR="$SRC_DIR/appimage"
    INSTALLER_GLOB="*.AppImage"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    BUNDLE_DIR="$SRC_DIR/nsis"
    BUNDLE_EXT=".exe"
    INSTALLER_DIR="$SRC_DIR/nsis"
    INSTALLER_GLOB="*.exe"
    ;;
esac

if [ -z "$BUNDLE_DIR" ] || [ -z "$BUNDLE_EXT" ] || [ -z "$INSTALLER_DIR" ] || [ -z "$INSTALLER_GLOB" ]; then
  echo -e "${RED}Unsupported platform: $(uname -s) $(uname -m)${NC}"
  exit 1
fi

find_first_artifact() {
  local artifact_dir="$1"
  local artifact_glob="$2"

  if [ ! -d "$artifact_dir" ]; then
    return 0
  fi

  find "$artifact_dir" -maxdepth 1 -name "$artifact_glob" ! -name "*.sig" 2>/dev/null | head -1 || true
}

# ── Check for existing artifacts ─────────────────────────────────────

ARTIFACTS_EXIST=false

EXISTING_BUNDLE=$(find_first_artifact "$BUNDLE_DIR" "*${BUNDLE_EXT}")
EXISTING_INSTALLER=$(find_first_artifact "$INSTALLER_DIR" "$INSTALLER_GLOB")

if [ -n "${EXISTING_BUNDLE:-}" ] && [ -f "${EXISTING_BUNDLE}.sig" ] && [ -n "${EXISTING_INSTALLER:-}" ]; then
  ARTIFACTS_EXIST=true
fi

if $ARTIFACTS_EXIST; then
  echo -e "${GREEN}Artifacts for v${VERSION} already exist — skipping build.${NC}"
else
  echo "Installing dependencies..."
  pnpm install

  echo "Building Tauri desktop app..."
  pnpm tauri build --bundles app,dmg

  echo "Build complete."
fi

# ── Upload to Cloudflare R2 ──────────────────────────────────────────

if [ -z "${R2_ENDPOINT:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
  echo -e "${YELLOW}[upload] R2_ENDPOINT or R2_BUCKET not set — skipping upload${NC}"
  exit 0
fi

# aws s3 CP wrapper for R2
r2_cp() { aws s3 --endpoint-url "$R2_ENDPOINT" cp "$@"; }
r2_cat() { aws s3 --endpoint-url "$R2_ENDPOINT" cp "$1" - 2>/dev/null; }

echo -e "[upload] detected platform: ${GREEN}${PLATFORM}${NC}"

# ── Find updater bundle + signature ──────────────────────────────────

find_bundle() {
  local bundle_dir="$1"
  local bundle_ext="$2"
  find_first_artifact "$bundle_dir" "*${bundle_ext}"
}

BUNDLE_FILE=$(find_bundle "$BUNDLE_DIR" "$BUNDLE_EXT")
SIG_FILE="${BUNDLE_FILE}.sig"

if [ -z "$BUNDLE_FILE" ] || [ ! -f "$BUNDLE_FILE" ]; then
  echo -e "${RED}[upload] updater bundle not found${NC}"
  exit 1
fi
if [ ! -f "$SIG_FILE" ]; then
  echo -e "${RED}[upload] signature file not found: $SIG_FILE${NC}"
  exit 1
fi

BUNDLE_NAME=$(basename "$BUNDLE_FILE")
SIGNATURE=$(<"$SIG_FILE")

echo -e "[upload] bundle: ${GREEN}${BUNDLE_NAME}${NC}"
echo -e "[upload] bucket: ${GREEN}${R2_BUCKET}${NC}"

# ── Upload bundle & signature ────────────────────────────────────────

echo "[upload] uploading bundle..."
r2_cp "$BUNDLE_FILE" "s3://${R2_BUCKET}/${BUNDLE_NAME}"
echo "[upload] uploading signature..."
r2_cp "$SIG_FILE"   "s3://${R2_BUCKET}/${BUNDLE_NAME}.sig"

# ── Upload installer (dmg / AppImage / exe) ───────────────────────────

INSTALLER_FILE=$(find_first_artifact "$INSTALLER_DIR" "$INSTALLER_GLOB")
if [ -n "${INSTALLER_FILE:-}" ] && [ -f "$INSTALLER_FILE" ]; then
  INSTALLER_NAME=$(basename "$INSTALLER_FILE")
  if [ "$(uname -s)" = "Darwin" ]; then
    INSTALLER_NAME="${APP_NAME}_${PLATFORM#darwin-}.dmg"
  fi
  echo "[upload] uploading installer: ${GREEN}${INSTALLER_NAME}${NC}"
  r2_cp "$INSTALLER_FILE" "s3://${R2_BUCKET}/${INSTALLER_NAME}"
else
  echo -e "${YELLOW}[upload] installer not found, skipping${NC}"
fi

# ── Update latest.json ───────────────────────────────────────────────

LATEST_JSON="/tmp/0xbuffer_latest.json"

echo "[upload] downloading existing latest.json..."
r2_cat "s3://${R2_BUCKET}/latest.json" > "$LATEST_JSON" || echo '{}' > "$LATEST_JSON"

export UPDATER_SIGNATURE="$SIGNATURE"
export UPDATER_PLATFORM="$PLATFORM"
export UPDATER_VERSION="$VERSION"
export UPDATER_PUB_DATE="$PUB_DATE"
export UPDATER_BASE_URL="${BASE_URL%/}"
export UPDATER_BUNDLE_NAME="$BUNDLE_NAME"
export UPDATER_LATEST_JSON="$LATEST_JSON"

node -e "
  const fs = require('fs');
  const latest = JSON.parse(fs.readFileSync(process.env.UPDATER_LATEST_JSON, 'utf-8'));
  if (!latest.platforms) latest.platforms = {};

  latest.version = process.env.UPDATER_VERSION;
  latest.notes = process.env.UPDATER_NOTES || '';
  latest.pub_date = process.env.UPDATER_PUB_DATE;

  latest.platforms[process.env.UPDATER_PLATFORM] = {
    signature: process.env.UPDATER_SIGNATURE,
    url: process.env.UPDATER_BASE_URL + '/' + process.env.UPDATER_BUNDLE_NAME,
  };

  fs.writeFileSync(process.env.UPDATER_LATEST_JSON, JSON.stringify(latest, null, 2) + '\n');
"

echo "[upload] latest.json updated:"
cat "$LATEST_JSON"

echo "[upload] uploading latest.json..."
r2_cp "$LATEST_JSON" "s3://${R2_BUCKET}/latest.json"

rm -f "$LATEST_JSON"

echo -e "${GREEN}[upload] done — artifacts uploaded to ${R2_BUCKET}${NC}"
