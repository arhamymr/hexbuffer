#!/usr/bin/env bash
set -e

echo "==> Updating Rust git dependencies..."
cargo update --manifest-path src-tauri/Cargo.toml -p hexbuffer-proxy -p browser-crawler -p hexbuffer-ai

echo "==> Running pnpm update..."
pnpm update

echo "==> Dependencies updated successfully!"
