#!/usr/bin/env bash
set -euo pipefail

APP_NAME="hexbuffer"
BASE_URL="${OXBUFFER_RELEASES_URL:-https://dist.0xbuffer.com}"
BASE_URL="${BASE_URL%/}"

OS="$(uname -s)"
ARCH="$(uname -m)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1"
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    echo "Missing required command: shasum or sha256sum" >&2
    exit 1
  fi
}

verify_checksum() {
  local file="$1"
  local checksum_file="$2"
  local name="$3"

  local expected_sha actual_sha
  expected_sha="$(awk '{print tolower($1); exit}' "$checksum_file")"
  if [[ ! "$expected_sha" =~ ^[[:xdigit:]]{64}$ ]]; then
    echo "Invalid checksum file for $name"
    exit 1
  fi

  actual_sha="$(sha256_file "$file" | awk '{print tolower($1)}')"
  if [ "$actual_sha" != "$expected_sha" ]; then
    echo "Checksum verification failed for $name"
    echo "Expected: $expected_sha"
    echo "Actual:   $actual_sha"
    exit 1
  fi

  echo "Checksum verified."
}

TMP_DIR="$(mktemp -d)"
LATEST_PATH="$TMP_DIR/latest.json"

cleanup() {
  # macOS mount cleanup (MOUNT_DIR may or may not exist)
  if [ "${MOUNT_DIR:-}" ] && [ -d "${MOUNT_DIR:-}" ]; then
    hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
  fi
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

# ── macOS ──────────────────────────────────────────────────────────────

install_macos() {
  local INSTALL_DIR="${OXBUFFER_INSTALL_DIR:-/Applications}"

  local DMG_ARCH
  case "$ARCH" in
    arm64)   DMG_ARCH="aarch64" ;;
    x86_64)  DMG_ARCH="x86_64" ;;
    *)
      echo "Unsupported architecture: $ARCH"
      exit 1
      ;;
  esac

  require_command curl
  require_command hdiutil
  require_command ditto
  require_command awk

  local DMG_NAME="${APP_NAME}_${VERSION}_${DMG_ARCH}.dmg"
  local DMG_PATH="$TMP_DIR/$DMG_NAME"
  local CHECKSUM_PATH="$TMP_DIR/$DMG_NAME.sha256"

  echo "Downloading $APP_NAME $VERSION for macOS $ARCH..."
  curl -fL "$BASE_URL/$DMG_NAME" -o "$DMG_PATH"
  curl -fL "$BASE_URL/$DMG_NAME.sha256" -o "$CHECKSUM_PATH"

  verify_checksum "$DMG_PATH" "$CHECKSUM_PATH" "$DMG_NAME"

  MOUNT_DIR="$TMP_DIR/mount"
  mkdir -p "$MOUNT_DIR"
  hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

  local APP_PATH
  APP_PATH="$(find "$MOUNT_DIR" -maxdepth 2 -name "$APP_NAME.app" -type d | head -n 1)"
  if [ -z "$APP_PATH" ]; then
    echo "Could not find $APP_NAME.app in $DMG_NAME"
    exit 1
  fi

  local TARGET_APP="$INSTALL_DIR/$APP_NAME.app"

  echo "Installing $APP_NAME to $INSTALL_DIR..."
  if [ -w "$INSTALL_DIR" ]; then
    ditto "$APP_PATH" "$TARGET_APP"
  else
    sudo ditto "$APP_PATH" "$TARGET_APP"
  fi

  echo "$APP_NAME installed successfully."
  echo "Open it with: open \"$TARGET_APP\""
}

# ── Linux ──────────────────────────────────────────────────────────────

install_linux() {
  local INSTALL_DIR="${OXBUFFER_INSTALL_DIR:-$HOME/.local/bin}"

  local APPIMAGE_ARCH
  case "$ARCH" in
    x86_64|amd64)  APPIMAGE_ARCH="amd64" ;;
    aarch64|arm64) APPIMAGE_ARCH="aarch64" ;;
    *)
      echo "Unsupported architecture: $ARCH"
      exit 1
      ;;
  esac

  require_command curl
  require_command awk
  require_command chmod

  local APPIMAGE_NAME="${APP_NAME}_${VERSION}_${APPIMAGE_ARCH}.AppImage"
  local APPIMAGE_PATH="$TMP_DIR/$APPIMAGE_NAME"
  local CHECKSUM_PATH="$TMP_DIR/$APPIMAGE_NAME.sha256"

  echo "Downloading $APP_NAME $VERSION for Linux $ARCH..."
  curl -fL "$BASE_URL/$APPIMAGE_NAME" -o "$APPIMAGE_PATH"
  curl -fL "$BASE_URL/$APPIMAGE_NAME.sha256" -o "$CHECKSUM_PATH"

  verify_checksum "$APPIMAGE_PATH" "$CHECKSUM_PATH" "$APPIMAGE_NAME"

  mkdir -p "$INSTALL_DIR"
  local TARGET_APPIMAGE="$INSTALL_DIR/$APPIMAGE_NAME"

  echo "Installing $APP_NAME to $INSTALL_DIR..."
  cp "$APPIMAGE_PATH" "$TARGET_APPIMAGE"
  chmod +x "$TARGET_APPIMAGE"

  # Create symlink for easy CLI access
  local SYMLINK="$INSTALL_DIR/$APP_NAME"
  ln -sf "$TARGET_APPIMAGE" "$SYMLINK"

  # Create .desktop file for application menu integration
  local DESKTOP_DIR="$HOME/.local/share/applications"
  local DESKTOP_FILE="$DESKTOP_DIR/$APP_NAME.desktop"
  mkdir -p "$DESKTOP_DIR"
  cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=hexbuffer
Comment=Security reconnaissance and proxy tool
Exec=$TARGET_APPIMAGE
Icon=hexbuffer
Type=Application
Categories=Development;Security;
Terminal=false
EOF

  echo "$APP_NAME installed successfully."
  echo "Run it with: $SYMLINK"
  echo "Or find it in your application menu."
}

# ── Platform dispatch ─────────────────────────────────────────────────

case "$OS" in
  Darwin)
    install_macos
    ;;
  Linux)
    install_linux
    ;;
  *)
    echo "Unsupported platform: $OS"
    echo "hexbuffer install script supports macOS and Linux."
    exit 1
    ;;
esac
