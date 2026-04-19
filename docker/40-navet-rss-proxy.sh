#!/bin/sh
set -eu

if command -v node >/dev/null 2>&1 && [ -f /usr/local/bin/navet-rss-proxy.mjs ]; then
  node /usr/local/bin/navet-rss-proxy.mjs &
fi
