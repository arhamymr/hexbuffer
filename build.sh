#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
pnpm install

echo "Building Tauri desktop app..."
pnpm tauri build

echo "Build complete."
