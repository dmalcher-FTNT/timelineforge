#!/usr/bin/env bash
# Start TimelineForge on a local static file server (macOS, Linux).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${PORT:-8080}"
BIND="${BIND:-127.0.0.1}"

if [[ -f VERSION.txt ]]; then
  echo "TimelineForge $(head -1 VERSION.txt | sed 's/TimelineForge //')"
else
  echo "TimelineForge"
fi
echo ""
echo "  URL:  http://${BIND}:${PORT}/"
if [[ "$BIND" == "127.0.0.1" ]]; then
  echo "  LAN:  BIND=0.0.0.0 PORT=${PORT} ./run.sh"
fi
echo "  Stop: Ctrl+C"
echo ""

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind "$BIND" --directory "$ROOT"
fi
if command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT" --bind "$BIND" --directory "$ROOT"
fi

echo "Python 3 is required. Install it, then run ./run.sh again."
exit 1
