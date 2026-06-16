#!/usr/bin/env bash
set -euo pipefail

# ── System dependency installer for Linux AppImage builds ──────────────
# Target: Ubuntu 22.04 / Debian 12 (oldest systems with WebKitGTK 4.1)
# Run as: sudo bash scripts/setup-linux-deps.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }

# ── Check we are on Linux ──────────────────────────────────────────────

case "$(uname -s)" in
  Linux) ;;
  *) error "This script is for Linux only. Current OS: $(uname -s)" ;;
esac

# ── Check for root ─────────────────────────────────────────────────────

if [ "$(id -u)" -ne 0 ]; then
  error "This script must be run as root (use sudo)."
fi

# ── Detect package manager ─────────────────────────────────────────────

if command -v apt-get >/dev/null 2>&1; then
  PM="apt"
elif command -v dnf >/dev/null 2>&1; then
  PM="dnf"
elif command -v pacman >/dev/null 2>&1; then
  PM="pacman"
else
  error "Unsupported package manager. This script supports apt (Debian/Ubuntu), dnf (Fedora), or pacman (Arch)."
fi

info "Detected package manager: $PM"

# ── Install system packages ────────────────────────────────────────────

install_apt() {
  apt-get update -qq

  apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libsecret-1-dev \
    libdbus-1-dev \
    patchelf \
    libfuse2 \
    file \
    git \
    pkg-config
}

install_dnf() {
  dnf install -y \
    gcc gcc-c++ make \
    curl \
    wget \
    openssl-devel \
    gtk3-devel \
    webkit2gtk4.1-devel \
    libayatana-appindicator-gtk3-devel \
    librsvg2-devel \
    libsecret-devel \
    dbus-devel \
    patchelf \
    fuse2 \
    file \
    git \
    pkg-config
}

install_pacman() {
  pacman -Syu --noconfirm \
    base-devel \
    curl \
    wget \
    openssl \
    gtk3 \
    webkit2gtk-4.1 \
    libayatana-appindicator \
    librsvg \
    libsecret \
    dbus \
    patchelf \
    fuse2 \
    file \
    git \
    pkg-config
}

case "$PM" in
  apt)    install_apt ;;
  dnf)    install_dnf ;;
  pacman) install_pacman ;;
esac

info "System packages installed."

# ── Rust toolchain ─────────────────────────────────────────────────────

if command -v rustc >/dev/null 2>&1; then
  info "Rust already installed: $(rustc --version)"
else
  info "Installing Rust toolchain..."
  # Run as the invoking user (not root) via sudo -u
  SUDO_USER="${SUDO_USER:-$USER}"
  sudo -u "$SUDO_USER" bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
  info "Rust installed. You may need to run: source \$HOME/.cargo/env"
fi

# ── Node.js ────────────────────────────────────────────────────────────

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
  if [ "$NODE_MAJOR" -ge 20 ]; then
    info "Node.js already installed: $(node --version)"
  else
    warn "Node.js $NODE_MAJOR found but version 20+ is required."
    warn "Install Node.js 20+ manually: https://nodejs.org"
  fi
else
  warn "Node.js not found."
  warn "Install Node.js 20+ from: https://nodejs.org"
  warn "Or via nvm: nvm install 20 && nvm use 20"
fi

# ── pnpm ───────────────────────────────────────────────────────────────

if command -v pnpm >/dev/null 2>&1; then
  info "pnpm already installed: $(pnpm --version)"
else
  if command -v npm >/dev/null 2>&1; then
    info "Installing pnpm..."
    npm install -g pnpm
    info "pnpm installed: $(pnpm --version)"
  else
    warn "pnpm not found and npm not available to install it."
    warn "Install pnpm manually: https://pnpm.io/installation"
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────

echo ""
info "Linux build environment setup complete."
echo ""
echo "  Next steps:"
echo "    1. Clone the repository (if not already)"
echo "    2. cd into the project and run: pnpm install"
echo "    3. Build the app: ./scripts/build.sh --bump"
echo ""
echo "  Notes:"
echo "    - Build on Ubuntu 22.04 or Debian 12 for maximum glibc compatibility"
echo "    - A Secret Service daemon (gnome-keyring, KDE Wallet) is needed at runtime"
echo "    - ARM AppImages must be built on ARM hardware (no cross-compilation)"
echo ""
