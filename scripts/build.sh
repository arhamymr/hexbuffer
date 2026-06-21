#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<EOF
Usage:
  ./scripts/build.sh                 Build/upload current VERSION
  ./scripts/build.sh --help          Show this help
  ./scripts/build.sh 2026.1.1        Bump to exact version, then build/upload
  ./scripts/build.sh --bump          Auto-increment patch version, then build/upload
  ./scripts/build.sh --version 2026.1.1
  ./scripts/build.sh --windows       Cross-compile Windows x86_64 from macOS/Linux
  ./scripts/build.sh --windows-all   Build/upload Windows x64, x86, and ARM64
  ./scripts/build.sh --all            Build native platform + all Windows targets
EOF
}

REQUESTED_VERSION=""
AUTO_BUMP=false
FORCE_BUILD=false
WINDOWS=false
WINDOWS_ALL=false
ALL=false

while [ $# -gt 0 ]; do
  case "$1" in
    --all)
      ALL=true
      FORCE_BUILD=true
      shift
      ;;
    --windows)
      WINDOWS=true
      FORCE_BUILD=true
      shift
      ;;
    --windows-all)
      WINDOWS_ALL=true
      FORCE_BUILD=true
      shift
      ;;
    --bump|-b)
      AUTO_BUMP=true
      FORCE_BUILD=true
      shift
      ;;
    --version|-v)
      if [ -z "${2:-}" ]; then
        echo "Missing value for $1"
        usage
        exit 1
      fi
      REQUESTED_VERSION="$2"
      FORCE_BUILD=true
      shift 2
      ;;
    --help|-h|help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
    *)
      if [ -n "$REQUESTED_VERSION" ]; then
        echo "Unexpected extra argument: $1"
        usage
        exit 1
      fi
      REQUESTED_VERSION="$1"
      FORCE_BUILD=true
      shift
      ;;
  esac
done

if [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
else
  echo "[env] .env not found; continuing with shell environment only"
fi

if $WINDOWS || $WINDOWS_ALL || $ALL; then
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ;; # native Windows — no cargo-xwin needed
    *)
      if ! command -v cargo-xwin >/dev/null 2>&1; then
        echo "cargo-xwin is required for cross-compiling Windows from $(uname -s)."
        echo "  cargo install --locked cargo-xwin"
        exit 1
      fi
      ;;
  esac
fi

ensure_rust_target() {
  local target="$1"
  if ! rustup target list --installed 2>/dev/null | grep -q "$target"; then
    echo "Installing Rust target: $target"
    rustup target add "$target"
  fi
}

if $WINDOWS; then
  ensure_rust_target x86_64-pc-windows-msvc
fi

if $WINDOWS_ALL || $ALL; then
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ;;
    *)
      for t in x86_64-pc-windows-msvc i686-pc-windows-msvc aarch64-pc-windows-msvc; do
        ensure_rust_target "$t"
      done
      ;;
  esac
fi

APP_NAME="hexbuffer"

if [ -n "$REQUESTED_VERSION" ]; then
  "$ROOT/scripts/bump-version.sh" "$REQUESTED_VERSION"
elif $AUTO_BUMP; then
  "$ROOT/scripts/bump-version.sh"
fi

VERSION="$(cat "$ROOT/VERSION")"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BASE_URL="${UPDATER_BASE_URL:-https://dist.0xbuffer.com}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WINDOWS_TARGETS=(
  "x86_64-pc-windows-msvc:windows-x86_64"
  "i686-pc-windows-msvc:windows-i686"
  "aarch64-pc-windows-msvc:windows-aarch64"
)

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
BUNDLE_TYPES=""

case "$(uname -s)" in
  Darwin)
    BUNDLE_DIR="$SRC_DIR/macos"
    BUNDLE_EXT=".app.tar.gz"
    INSTALLER_DIR="$SRC_DIR/dmg"
    INSTALLER_GLOB="*.dmg"
    BUNDLE_TYPES="app,dmg"
    ;;
  Linux)
    BUNDLE_DIR="$SRC_DIR/appimage"
    BUNDLE_EXT=".AppImage"
    INSTALLER_DIR="$SRC_DIR/appimage"
    INSTALLER_GLOB="*.AppImage"
    BUNDLE_TYPES="appimage"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    BUNDLE_DIR="$SRC_DIR/nsis"
    BUNDLE_EXT=".exe"
    INSTALLER_DIR="$SRC_DIR/nsis"
    INSTALLER_GLOB="*.exe"
    BUNDLE_TYPES="nsis"
    ;;
esac

if [ -z "$BUNDLE_DIR" ] || [ -z "$BUNDLE_EXT" ] || [ -z "$INSTALLER_DIR" ] || [ -z "$INSTALLER_GLOB" ] || [ -z "$BUNDLE_TYPES" ]; then
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

has_newer_build_inputs() {
  local artifact="$1"

  if [ -z "$artifact" ] || [ ! -f "$artifact" ]; then
    return 0
  fi

  [ -n "$(find \
    "$ROOT/VERSION" \
    "$ROOT/package.json" \
    "$ROOT/pnpm-lock.yaml" \
    "$ROOT/src" \
    "$ROOT/src-tauri/Cargo.toml" \
    "$ROOT/src-tauri/Cargo.lock" \
    "$ROOT/src-tauri/tauri.conf.json" \
    "$ROOT/src-tauri/src" \
    "$ROOT/src-tauri/icons" \
    -newer "$artifact" 2>/dev/null | head -1)" ]
}

windows_bundle_dir_for_target() {
  local rust_target="$1"
  echo "src-tauri/target/${rust_target}/release/bundle/nsis"
}

windows_runner_args() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) echo "" ;; # native — no runner needed
    *) echo "--runner cargo-xwin" ;;
  esac
}

build_windows() {
  echo "Installing dependencies..."
  pnpm install

  local runner_args
  runner_args=$(windows_runner_args)

  echo "Cross-compiling Tauri Windows app (x86_64)..."
  pnpm tauri build $runner_args --target x86_64-pc-windows-msvc --bundles nsis

  echo "Windows build complete."
}

build_windows_all() {
  echo "Installing dependencies..."
  pnpm install

  local runner_args entry rust_target updater_platform
  runner_args=$(windows_runner_args)

  for entry in "${WINDOWS_TARGETS[@]}"; do
    rust_target="${entry%%:*}"
    updater_platform="${entry#*:}"

    echo "Building Tauri Windows app for ${updater_platform} (${rust_target})..."
    pnpm tauri build $runner_args --target "$rust_target" --bundles nsis
  done

  echo "Windows builds complete."
}

build_all() {
  echo "Installing dependencies..."
  pnpm install

  # ── Native platform build ─────────────────────────────────────────
  echo "Building native platform ($PLATFORM)..."
  pnpm tauri build --bundles "$BUNDLE_TYPES"
  echo "Native build complete."

  # ── Windows cross-compile ─────────────────────────────────────────
  local runner_args
  runner_args=$(windows_runner_args)

  if [ -n "$runner_args" ]; then
    local entry rust_target updater_platform
    for entry in "${WINDOWS_TARGETS[@]}"; do
      rust_target="${entry%%:*}"
      updater_platform="${entry#*:}"

      echo "Cross-compiling Windows app for ${updater_platform} (${rust_target})..."
      pnpm tauri build $runner_args --target "$rust_target" --bundles nsis
    done
    echo "Windows builds complete."
  else
    echo "Already on Windows — native build covers this platform."
  fi
}

if $WINDOWS_ALL; then
  build_windows_all
elif $WINDOWS; then
  build_windows
elif $ALL; then
  build_all
else
  # ── Check for existing artifacts ─────────────────────────────────────

  ARTIFACTS_EXIST=false
  ARTIFACTS_STALE=false

  EXISTING_BUNDLE=$(find_first_artifact "$BUNDLE_DIR" "*${BUNDLE_EXT}")
  EXISTING_INSTALLER=$(find_first_artifact "$INSTALLER_DIR" "$INSTALLER_GLOB")

  if [ -n "${EXISTING_BUNDLE:-}" ] && [ -f "${EXISTING_BUNDLE}.sig" ] && [ -n "${EXISTING_INSTALLER:-}" ]; then
    ARTIFACTS_EXIST=true
  fi

  if $ARTIFACTS_EXIST && has_newer_build_inputs "$EXISTING_BUNDLE"; then
    ARTIFACTS_STALE=true
  fi

  if $ARTIFACTS_EXIST && ! $ARTIFACTS_STALE && ! $FORCE_BUILD; then
    echo -e "${GREEN}Artifacts for v${VERSION} already exist — skipping build.${NC}"
  else
    if $FORCE_BUILD; then
      echo "Version bump requested; building fresh artifacts for v${VERSION}..."
    elif $ARTIFACTS_STALE; then
      echo "Build inputs changed since the existing updater artifact; rebuilding fresh artifacts for v${VERSION}..."
    fi

    echo "Installing dependencies..."
    pnpm install

    # Ensure Windows target is available (needed by some dependencies even on non-Windows)
    ensure_rust_target x86_64-pc-windows-msvc

    echo "Building Tauri desktop app..."
    pnpm tauri build --bundles "$BUNDLE_TYPES"

    echo "Build complete."
  fi
fi

# ── Upload to Cloudflare R2 ──────────────────────────────────────────

if [ -z "${R2_ENDPOINT:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
  echo -e "${YELLOW}[upload] R2_ENDPOINT or R2_BUCKET not set — skipping upload${NC}"
  exit 0
fi

# aws s3 CP wrapper for R2
r2_cp() { aws s3 --endpoint-url "$R2_ENDPOINT" cp "$@"; }
r2_cat() { aws s3 --endpoint-url "$R2_ENDPOINT" cp "$1" - 2>/dev/null; }
sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1"
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    echo "Missing required command: shasum or sha256sum" >&2
    return 1
  fi
}

find_bundle() {
  local bundle_dir="$1"
  local bundle_ext="$2"
  find_first_artifact "$bundle_dir" "*${bundle_ext}"
}

upload_installer_checksum() {
  local installer_file="$1"
  local installer_name="$2"
  local installer_sha_file

  installer_sha_file="/tmp/${installer_name}.sha256"
  sha256_file "$installer_file" | awk -v name="$installer_name" '{print $1 "  " name}' > "$installer_sha_file"
  echo "[upload] uploading installer checksum: ${GREEN}${installer_name}.sha256${NC}"
  r2_cp "$installer_sha_file" "s3://${R2_BUCKET}/${installer_name}.sha256"
  rm -f "$installer_sha_file"
}

update_latest_platform() {
  local latest_json="$1"
  local platform="$2"
  local signature="$3"
  local bundle_name="$4"

  export UPDATER_SIGNATURE="$signature"
  export UPDATER_PLATFORM="$platform"
  export UPDATER_VERSION="$VERSION"
  export UPDATER_PUB_DATE="$PUB_DATE"
  export UPDATER_BASE_URL="${BASE_URL%/}"
  export UPDATER_BUNDLE_NAME="$bundle_name"
  export UPDATER_LATEST_JSON="$latest_json"

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
}

upload_platform_artifacts() {
  local platform="$1"
  local bundle_dir="$2"
  local bundle_ext="$3"
  local installer_dir="$4"
  local installer_glob="$5"
  local latest_json="$6"
  local installer_name_override="${7:-}"
  local bundle_file sig_file bundle_name signature installer_file installer_name

  bundle_file=$(find_bundle "$bundle_dir" "$bundle_ext")
  sig_file="${bundle_file}.sig"

  if [ -z "$bundle_file" ] || [ ! -f "$bundle_file" ]; then
    echo -e "${RED}[upload] updater bundle not found for ${platform}${NC}"
    exit 1
  fi
  if [ ! -f "$sig_file" ]; then
    echo -e "${RED}[upload] signature file not found for ${platform}: $sig_file${NC}"
    exit 1
  fi

  bundle_name=$(basename "$bundle_file")
  signature=$(<"$sig_file")

  echo -e "[upload] platform: ${GREEN}${platform}${NC}"
  echo -e "[upload] bundle: ${GREEN}${bundle_name}${NC}"
  echo -e "[upload] bucket: ${GREEN}${R2_BUCKET}${NC}"

  echo "[upload] uploading bundle..."
  r2_cp "$bundle_file" "s3://${R2_BUCKET}/${bundle_name}"
  echo "[upload] uploading signature..."
  r2_cp "$sig_file" "s3://${R2_BUCKET}/${bundle_name}.sig"

  installer_file=$(find_first_artifact "$installer_dir" "$installer_glob")
  if [ -n "${installer_file:-}" ] && [ -f "$installer_file" ]; then
    installer_name=$(basename "$installer_file")
    if [ -n "$installer_name_override" ]; then
      installer_name="$installer_name_override"
    fi

    echo "[upload] uploading installer: ${GREEN}${installer_name}${NC}"
    r2_cp "$installer_file" "s3://${R2_BUCKET}/${installer_name}"
    upload_installer_checksum "$installer_file" "$installer_name"
  else
    echo -e "${YELLOW}[upload] installer not found for ${platform}, skipping${NC}"
  fi

  update_latest_platform "$latest_json" "$platform" "$signature" "$bundle_name"
}

echo -e "[upload] detected platform: ${GREEN}${PLATFORM}${NC}"

echo "[upload] uploading install script..."
r2_cp "$ROOT/scripts/install.sh" "s3://${R2_BUCKET}/install.sh"

# ── Update latest.json ───────────────────────────────────────────────

LATEST_JSON="/tmp/hexbuffer_latest.json"

echo "[upload] downloading existing latest.json..."
r2_cat "s3://${R2_BUCKET}/latest.json" > "$LATEST_JSON" || echo '{}' > "$LATEST_JSON"

if $WINDOWS_ALL; then
  for entry in "${WINDOWS_TARGETS[@]}"; do
    rust_target="${entry%%:*}"
    updater_platform="${entry#*:}"
    target_bundle_dir=$(windows_bundle_dir_for_target "$rust_target")
    upload_platform_artifacts "$updater_platform" "$target_bundle_dir" ".exe" "$target_bundle_dir" "*.exe" "$LATEST_JSON"
  done
elif $WINDOWS; then
  target_bundle_dir=$(windows_bundle_dir_for_target "x86_64-pc-windows-msvc")
  upload_platform_artifacts "windows-x86_64" "$target_bundle_dir" ".exe" "$target_bundle_dir" "*.exe" "$LATEST_JSON"
elif $ALL; then
  # Upload native platform artifacts
  INSTALLER_NAME_OVERRIDE=""
  if [ "$(uname -s)" = "Darwin" ]; then
    INSTALLER_NAME_OVERRIDE="${APP_NAME}_${VERSION}_${PLATFORM#darwin-}.dmg"
  fi
  upload_platform_artifacts "$PLATFORM" "$BUNDLE_DIR" "$BUNDLE_EXT" "$INSTALLER_DIR" "$INSTALLER_GLOB" "$LATEST_JSON" "$INSTALLER_NAME_OVERRIDE"

  # Upload Windows artifacts (only if cross-compiled)
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ;; # already uploaded as native platform
    *)
      for entry in "${WINDOWS_TARGETS[@]}"; do
        rust_target="${entry%%:*}"
        updater_platform="${entry#*:}"
        target_bundle_dir=$(windows_bundle_dir_for_target "$rust_target")
        upload_platform_artifacts "$updater_platform" "$target_bundle_dir" ".exe" "$target_bundle_dir" "*.exe" "$LATEST_JSON"
      done
      ;;
  esac
else
  INSTALLER_NAME_OVERRIDE=""
  if [ "$(uname -s)" = "Darwin" ]; then
    INSTALLER_NAME_OVERRIDE="${APP_NAME}_${VERSION}_${PLATFORM#darwin-}.dmg"
  fi

  upload_platform_artifacts "$PLATFORM" "$BUNDLE_DIR" "$BUNDLE_EXT" "$INSTALLER_DIR" "$INSTALLER_GLOB" "$LATEST_JSON" "$INSTALLER_NAME_OVERRIDE"
fi

echo "[upload] latest.json updated:"
cat "$LATEST_JSON"

echo "[upload] uploading latest.json..."
r2_cp "$LATEST_JSON" "s3://${R2_BUCKET}/latest.json"

rm -f "$LATEST_JSON"

echo -e "${GREEN}[upload] done — artifacts uploaded to ${R2_BUCKET}${NC}"
