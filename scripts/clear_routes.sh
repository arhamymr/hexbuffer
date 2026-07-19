#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Route cleanup is currently for macOS only." >&2
  exit 1
fi

echo "[+] Safely clearing stale VPN routes..."

stale=0
netstat -nr -f inet | grep 'utun' | awk '{print $1}' | while read -r route; do
    if [ "$route" != "default" ]; then
        echo "[-] Removing stale route: $route"
        route -n delete -net "$route" >/dev/null 2>&1
        stale=$((stale + 1))
    fi
done

if [ $stale -eq 0 ]; then
    echo "[+] No stale utun routes found. Nothing to clean."
else
    echo "[+] Precision cleanup complete. Removed $stale stale route(s)."
fi
echo "[+] Ready for new connection."
