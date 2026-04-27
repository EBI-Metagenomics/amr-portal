#!/usr/bin/env bash
# Merge Eleventy (content) + Vite (React app) into a single tree for nginx.
# Intended layout after ingress strips /amr prefix:
#   /                 → Eleventy home (index.html)
#   /usage/, /about/ → content pages
#   /data/            → React SPA (try_files → /data/index.html)
#
# Usage (from repo root):
#   ./scripts/merge-frontend-dist.sh [OUTPUT_DIR] [CONTENT_DIR] [APP_DIR]
# Defaults: portal-static/dist  portal-static/content-dist  frontend/app-dist

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MERGED="${1:-portal-static/dist}"
CONTENT="${2:-portal-static/content-dist}"
APP="${3:-frontend/app-dist}"

if [[ ! -d "$CONTENT" ]]; then
  echo "merge-frontend-dist: missing content dir: $CONTENT (run Eleventy build in portal-static/)" >&2
  exit 1
fi
if [[ ! -d "$APP" ]]; then
  echo "merge-frontend-dist: missing app dir: $APP (run Vite build in frontend/)" >&2
  exit 1
fi

rm -rf "$MERGED"
mkdir -p "$MERGED"
cp -a "${CONTENT}/." "$MERGED/"
mkdir -p "$MERGED/data"
# App lives under /data/ in the browser (public path /amr/data/ before ingress rewrite).
cp -a "${APP}/." "$MERGED/data/"

echo "merge-frontend-dist: wrote $MERGED (content from $CONTENT, SPA from $APP → $MERGED/data/)"
