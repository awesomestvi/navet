#!/bin/sh
set -eu

case "${1:-}" in
  nginx|nginx-debug)
    for argument in "$@"; do
      case "$argument" in
        -t|-T|-v|-V|-h|-\?|-s)
          exec /docker-entrypoint.sh "$@"
          ;;
      esac
    done
    exec /usr/local/bin/navet-runtime /docker-entrypoint.sh "$@"
    ;;
  *)
    exec /docker-entrypoint.sh "$@"
    ;;
esac
