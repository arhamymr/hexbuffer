#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat <<EOF
Usage:
  pnpm run deploy                         Auto-increment patch version, then build/upload
  pnpm run deploy -- --help               Show this help
  pnpm run deploy -- --bump               Auto-increment patch version, then build/upload
  pnpm run deploy -- --version 2026.1.1   Bump to exact version, then build/upload
  pnpm run deploy -- 2026.1.1             Bump to exact version, then build/upload
  pnpm run deploy -- --windows-all        Build/upload Windows x64, x86, and ARM64

Notes:
  - Pass script args after -- when using pnpm.
  - Use "pnpm run deploy"; "pnpm deploy" is a pnpm built-in command.
  - --windows-all must be run on a Windows release machine.
  - Upload uses R2_ENDPOINT, R2_BUCKET, and optional UPDATER_BASE_URL.
EOF
}

if [ "${1:-}" = "--" ]; then
  shift
fi

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ "$#" -eq 0 ]; then
  exec "$ROOT/scripts/build.sh" --bump
fi

exec "$ROOT/scripts/build.sh" "$@"
