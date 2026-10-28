#!/usr/bin/env bash
# Capture desktop and mobile screenshots of CAPTURE_URL into CAPTURE_DIR.
# Exit 75 for temporary navigation/browser infrastructure failures, 1 otherwise.
set -euo pipefail
cd "$(dirname "$0")"

: "${CAPTURE_URL:?Set CAPTURE_URL to the preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the source.}"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"

echo "==> Capturing $CAPTURE_URL"
/usr/bin/time -p test -f "$RUNTIME_DIR/scripts/default-capture.mjs"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"

set +e
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
status=$?
set -e

if [ "$status" -eq 75 ]; then
  echo "==> Temporary browser/navigation failure (exit 75)" >&2
  exit 75
fi
if [ "$status" -ne 0 ]; then
  echo "==> Capture failed (exit $status)" >&2
  exit 1
fi

for view in desktop mobile; do
  file="$CAPTURE_DIR/final-$view.png"
  /usr/bin/time -p test -s "$file"
  bytes="$(/usr/bin/time -p stat -c '%s' "$file")"
  if [ "$bytes" -lt 5000 ]; then
    echo "==> $file looks blank (${bytes} bytes)" >&2
    exit 1
  fi
  echo "==> $file (${bytes} bytes)"
done

echo "==> Capture complete"
