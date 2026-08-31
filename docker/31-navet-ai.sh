#!/bin/sh
set -eu

mkdir -p /data/navet-ai
chown -R nginx:nginx /data/navet-ai
su-exec nginx node /opt/navet/navet-ai-server.mjs &
