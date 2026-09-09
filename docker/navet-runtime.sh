#!/bin/sh
set -eu

# Supervise the two local services together. Docker / Supervisor owns restarts.
transport_pid=
nginx_pid=
cleanup() {
  trap '' INT TERM
  if [ -n "$nginx_pid" ]; then kill -TERM "$nginx_pid" 2>/dev/null || true; fi
  if [ -n "$transport_pid" ]; then kill -TERM "$transport_pid" 2>/dev/null || true; fi
  if [ -n "$nginx_pid" ]; then wait "$nginx_pid" 2>/dev/null || true; fi
  if [ -n "$transport_pid" ]; then wait "$transport_pid" 2>/dev/null || true; fi
}
trap 'cleanup; exit 143' TERM
trap 'cleanup; exit 130' INT

mkdir -p /run/navet
chown nginx:nginx /run/navet
chmod 750 /run/navet
rm -f /run/navet/rss-transport.sock
su-exec nginx /etc/navet/rss-transport &
transport_pid=$!

attempt=0
while [ ! -S /run/navet/rss-transport.sock ]; do
  if ! kill -0 "$transport_pid" 2>/dev/null; then
    echo 'Navet RSS transport exited before readiness' >&2
    cleanup
    exit 1
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 100 ]; then
    echo 'Navet RSS transport did not become ready' >&2
    cleanup
    exit 1
  fi
  sleep 0.1
done

"$@" &
nginx_pid=$!
set +e
# BusyBox ash wait -n can miss a child terminated by a signal. Observe both known PIDs
# directly; ash reaps exited children while the foreground sleep completes.
while kill -0 "$transport_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 1
done
if kill -0 "$transport_pid" 2>/dev/null; then
  wait "$nginx_pid"
else
  wait "$transport_pid"
fi
status=$?
cleanup
# An unsolicited clean service exit is still an incomplete runtime.
if [ "$status" -eq 0 ]; then status=1; fi
exit "$status"
