#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Unit + smoke tests (node) =="
node --test tests/unit/*.test.js tests/smoke/*.test.js

echo ""
echo "== E2E tests (Playwright) =="
npm run test:e2e

echo ""
echo "All tests passed."
