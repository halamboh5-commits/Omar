#!/usr/bin/env bash
# Build the static app and serve it in the foreground on PORT (default 3000).
set -euo pipefail
cd "$(dirname "$0")"

APP_ROOT="$(pwd)"
PORT="${PORT:-3000}"
DIST_DIR="$APP_ROOT/dist"

echo "==> مدار: build and serve (port $PORT)"

/usr/bin/time -p test -f "$APP_ROOT/src/index.html"
/usr/bin/time -p test -f "$APP_ROOT/src/styles.css"
/usr/bin/time -p test -f "$APP_ROOT/src/app.js"

if [ -f "$APP_ROOT/package.json" ]; then
  if [ -f "$APP_ROOT/package-lock.json" ]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
else
  echo "==> No package.json; using dependency-free static build"
fi

/usr/bin/time -p rm -rf "$DIST_DIR"
/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p cp -R "$APP_ROOT/src/." "$DIST_DIR/"
/usr/bin/time -p test -f "$DIST_DIR/index.html"

if [ -n "${OPENCODE_WEB_DIR:-}" ]; then
  /usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
  /usr/bin/time -p node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const [outDir, project, directory] = process.argv.slice(1);
    fs.writeFileSync(
      path.join(outDir, "deployment-output.json"),
      JSON.stringify({ project, directory })
    );
  ' "$OPENCODE_WEB_DIR" "$APP_ROOT" "$DIST_DIR"
  echo "==> deployment-output.json -> $DIST_DIR"
fi

echo "==> Serving $DIST_DIR on 0.0.0.0:$PORT"
exec node "$APP_ROOT/serve.mjs"
