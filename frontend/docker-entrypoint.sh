#!/bin/sh
set -eu

RUNTIME_CONFIG=/usr/share/nginx/html/data/runtime-config.js

API_BASE_URL="${VITE_API_BASE_URL:-/amr/api}"
B64=$(printf '%s' "$API_BASE_URL" | base64 | tr -d '\n')
printf 'window.__AMR_API_BASE_URL__=atob("%s");\n' "$B64" > "$RUNTIME_CONFIG"

FA="${VITE_GENOME_FASTA_BASE_URL:-}"
if [ -n "$FA" ]; then
  B64FA=$(printf '%s' "$FA" | base64 | tr -d '\n')
  printf 'window.__AMR_GENOME_FASTA_BASE_URL__=atob("%s");\n' "$B64FA" >> "$RUNTIME_CONFIG"
fi

GF="${VITE_GENOME_GFF_BASE_URL:-}"
if [ -n "$GF" ]; then
  B64GF=$(printf '%s' "$GF" | base64 | tr -d '\n')
  printf 'window.__AMR_GENOME_GFF_BASE_URL__=atob("%s");\n' "$B64GF" >> "$RUNTIME_CONFIG"
fi

GV="${VITE_ENABLE_GENOME_VIEWER:-}"
if [ -n "$GV" ]; then
  printf 'window.__AMR_ENABLE_GENOME_VIEWER__="%s";\n' "$GV" >> "$RUNTIME_CONFIG"
fi

ME="${VITE_MATOMO_ENABLED:-}"
if [ -n "$ME" ]; then
  printf 'window.__AMR_MATOMO_ENABLED__="%s";\n' "$ME" >> "$RUNTIME_CONFIG"
fi

MU="${VITE_MATOMO_URL:-}"
if [ -n "$MU" ]; then
  B64MU=$(printf '%s' "$MU" | base64 | tr -d '\n')
  printf 'window.__AMR_MATOMO_URL__=atob("%s");\n' "$B64MU" >> "$RUNTIME_CONFIG"
fi

MS="${VITE_MATOMO_SITE_ID:-}"
if [ -n "$MS" ]; then
  printf 'window.__AMR_MATOMO_SITE_ID__="%s";\n' "$MS" >> "$RUNTIME_CONFIG"
fi

MJ="${VITE_MATOMO_SCRIPT_URL:-}"
if [ -n "$MJ" ]; then
  B64MJ=$(printf '%s' "$MJ" | base64 | tr -d '\n')
  printf 'window.__AMR_MATOMO_SCRIPT_URL__=atob("%s");\n' "$B64MJ" >> "$RUNTIME_CONFIG"
fi

exec nginx -g 'daemon off;'
