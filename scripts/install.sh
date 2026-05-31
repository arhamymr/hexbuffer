#!/usr/bin/env bash
set -euo pipefail

APP_NAME="0xbuffer"
BASE_URL="${OXBUFFER_RELEASES_URL:-https://dist.0xbuffer.com}"
INSTALL_DIR="${OXBUFFER_INSTALL_DIR:-/Applications}"

ARCH="$(uname -m)"
case "$ARCH" in
  arm64)
    DMG_NAME="${APP_NAME}_aarch64.dmg"
    ;;
  x86_64)
    DMG_NAME="${APP_NAME}_x86_64.dmg"
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
require_command xattr

TMP_DIR="$(mktemp -d)"
DMG_PATH="$TMP_DIR/$DMG_NAME"
MOUNT_DIR="$TMP_DIR/mount"

cleanup() {
  hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Downloading $APP_NAME for $ARCH..."
curl -fL "$BASE_URL/$DMG_NAME" -o "$DMG_PATH"

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

echo "Removing macOS quarantine flag..."
if [ -w "$TARGET_APP" ]; then
  xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || true
else
  sudo xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || true
fi

echo "$APP_NAME installed successfully."
echo "Open it with: open \"$TARGET_APP\""
