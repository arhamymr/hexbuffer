#!/usr/bin/env bash
set -euo pipefail

APP_NAME="hexbuffer"
BASE_URL="${OXBUFFER_RELEASES_URL:-https://dist.hexbuffer.com}"
BASE_URL="${BASE_URL%/}"
INSTALL_DIR="${OXBUFFER_INSTALL_DIR:-/Applications}"

ARCH="$(uname -m)"
case "$ARCH" in
  arm64)
    DMG_ARCH="aarch64"
    ;;
  x86_64)
    DMG_ARCH="x86_64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command curl
require_command hdiutil
require_command ditto
require_command shasum
require_command awk

TMP_DIR="$(mktemp -d)"
LATEST_PATH="$TMP_DIR/latest.json"
MOUNT_DIR="$TMP_DIR/mount"

cleanup() {
  hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Resolving latest $APP_NAME version..."
curl -fsSL "$BASE_URL/latest.json" -o "$LATEST_PATH"

VERSION="$(awk -F'"' '/"version"[[:space:]]*:/ {print $4; exit}' "$LATEST_PATH")"
if [[ ! "$VERSION" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid version in latest.json"
  exit 1
fi

DMG_NAME="${APP_NAME}_${VERSION}_${DMG_ARCH}.dmg"
DMG_PATH="$TMP_DIR/$DMG_NAME"
CHECKSUM_PATH="$TMP_DIR/$DMG_NAME.sha256"

echo "Downloading $APP_NAME $VERSION for $ARCH..."
curl -fL "$BASE_URL/$DMG_NAME" -o "$DMG_PATH"
curl -fL "$BASE_URL/$DMG_NAME.sha256" -o "$CHECKSUM_PATH"

EXPECTED_SHA="$(awk '{print tolower($1); exit}' "$CHECKSUM_PATH")"
if [[ ! "$EXPECTED_SHA" =~ ^[[:xdigit:]]{64}$ ]]; then
  echo "Invalid checksum file for $DMG_NAME"
  exit 1
fi

ACTUAL_SHA="$(shasum -a 256 "$DMG_PATH" | awk '{print tolower($1)}')"
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "Checksum verification failed for $DMG_NAME"
  echo "Expected: $EXPECTED_SHA"
  echo "Actual:   $ACTUAL_SHA"
  exit 1
fi

echo "Checksum verified."

mkdir -p "$MOUNT_DIR"
hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

APP_PATH="$(find "$MOUNT_DIR" -maxdepth 2 -name "$APP_NAME.app" -type d | head -n 1)"
if [ -z "$APP_PATH" ]; then
  echo "Could not find $APP_NAME.app in $DMG_NAME"
  exit 1
fi

TARGET_APP="$INSTALL_DIR/$APP_NAME.app"

echo "Installing $APP_NAME to $INSTALL_DIR..."
if [ -w "$INSTALL_DIR" ]; then
  ditto "$APP_PATH" "$TARGET_APP"
else
  sudo ditto "$APP_PATH" "$TARGET_APP"
fi

echo "$APP_NAME installed successfully."
echo "Open it with: open \"$TARGET_APP\""
