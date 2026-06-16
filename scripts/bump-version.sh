#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CURRENT=$(cat "$ROOT/VERSION")
THIS_YEAR=$(date +%Y)

if [ -n "${1:-}" ]; then
  NEW_VERSION="$1"
else
  IFS=. read -r CURRENT_YEAR MAJOR PATCH <<< "$CURRENT"
  if [ "$CURRENT_YEAR" = "$THIS_YEAR" ]; then
    NEW_VERSION="${CURRENT_YEAR}.${MAJOR}.$((PATCH + 1))"
  else
    NEW_VERSION="${THIS_YEAR}.1.0"
  fi
fi

echo "bumping $CURRENT → $NEW_VERSION"

echo "$NEW_VERSION" > "$ROOT/VERSION"

node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$ROOT/package.json', 'utf-8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('$ROOT/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

if [ "$(uname -s)" = "Darwin" ]; then
  sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" "$ROOT/src-tauri/Cargo.toml"
else
  sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" "$ROOT/src-tauri/Cargo.toml"
fi

node -e "
  const fs = require('fs');
  const cfg = JSON.parse(fs.readFileSync('$ROOT/src-tauri/tauri.conf.json', 'utf-8'));
  cfg.version = '$NEW_VERSION';
  fs.writeFileSync('$ROOT/src-tauri/tauri.conf.json', JSON.stringify(cfg, null, 2) + '\n');
"

echo "done — package.json, Cargo.toml, tauri.conf.json all at $NEW_VERSION"
