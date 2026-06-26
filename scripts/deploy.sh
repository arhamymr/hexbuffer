#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"


export TAURI_SIGNING_PRIVATE_KEY="dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5KytaNjI1em1zelZMWFNsb21QQ2svUnNVMUlTZ1Iza0o0dzNmK1Q1SlVUNEFBQkFBQUFBQUFBQUFBQUlBQUFBQVpYL2RPQzl3bVRybFdINnEvKzBHOUVLT21UWDVTdCttWGg0TVR3a1RUUDliSkJFKysyOFdENldQY1hoRi9jbEdkaEQxcmR5M0w5TWRVRFljYVVKTytmdDRmTzdHenA2NmRGT2paUy9xS2J1STVKUWI5bVlJd0UwZWtXVmJDcGNlcEFFTEpTeGJFaEE9Cg=="


usage() {
  cat <<EOF
Usage:
  pnpm run deploy                         Auto-increment patch version, then build/upload
  pnpm run deploy -- --help               Show this help
  pnpm run deploy -- --bump               Auto-increment patch version, then build/upload
  pnpm run deploy -- --version 2026.1.1   Bump to exact version, then build/upload
  pnpm run deploy -- 2026.1.1             Bump to exact version, then build/upload
  pnpm run deploy -- --windows            Cross-compile Windows x86_64 from macOS/Linux
  pnpm run deploy -- --windows-all        Build/upload Windows x64, x86, and ARM64
  pnpm run deploy -- --all                Build native platform + all Windows targets

Notes:
  - Pass script args after -- when using pnpm.
  - Use "pnpm run deploy"; "pnpm deploy" is a pnpm built-in command.
  - --windows and --windows-all can cross-compile from macOS/Linux with cargo-xwin.
  - Upload uses R2_ENDPOINT, R2_BUCKET, and optional UPDATER_BASE_URL.
EOF
}

if [ "${1:-}" = "--" ]; then
  shift
fi

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "help" ]; then
  usage
  exit 0
fi

if [ "$#" -eq 0 ]; then
  exec "$ROOT/scripts/build.sh" --bump
fi

exec "$ROOT/scripts/build.sh" "$@"
