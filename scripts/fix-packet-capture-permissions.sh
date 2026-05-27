#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This permission helper is currently for macOS only." >&2
  exit 1
fi

if ! compgen -G "/dev/bpf*" > /dev/null; then
  echo "No /dev/bpf* devices found. Start a capture once, then rerun this script." >&2
  exit 1
fi

echo "Granting packet capture access to /dev/bpf* devices..."
sudo chmod a+rw /dev/bpf*
echo "Packet capture permissions updated. Retry capture in the app."
