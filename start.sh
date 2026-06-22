#!/bin/sh
# Dual-mode startup for the app pod.
#
# Two-pod mode  (EXPO_PUBLIC_ROOM_API_URL is set):
#   nginx proxies /rooms to the external server pod URL.
#   A background keep-alive loop pings the server pod every 50s so the
#   Alphinium proxy does not expire it due to inactivity.
#
# Single-pod mode (EXPO_PUBLIC_ROOM_API_URL is empty — local dev default):
#   An embedded Node.js server is started on port 3001.
#   nginx proxies /rooms to 127.0.0.1:3001.
set -e

mkdir -p /var/log/nginx /var/lib/nginx/tmp /run

if [ -n "$EXPO_PUBLIC_ROOM_API_URL" ]; then
  # ── Two-pod mode ───────────────────────────────────────────────────────────
  # nginx proxies /rooms to the external server pod.
  ROOMS_UPSTREAM="${EXPO_PUBLIC_ROOM_API_URL}"
  echo "Two-pod mode: proxying /rooms → ${ROOMS_UPSTREAM}"

  # Keep the server pod alive: ping it every 50s so the Alphinium proxy does
  # not terminate it due to inactivity (health checks don't count as traffic).
  echo "Keep-alive: pinging ${ROOMS_UPSTREAM}/rooms every 50s"
  (while true; do
    wget -q -O /dev/null "${ROOMS_UPSTREAM}/rooms" 2>/dev/null || true
    sleep 50
  done) &

else
  # ── Single-pod mode ────────────────────────────────────────────────────────
  # Start the embedded Node.js server and wait for it to be ready.
  ROOMS_UPSTREAM="http://127.0.0.1:3001"
  echo "Single-pod mode: starting embedded Node.js server on port 3001"

  export PORT=3001
  node /server/index.js &
  NODE_PID=$!

  echo "Waiting for Node.js server to be ready..."
  for i in $(seq 1 30); do
    if wget -q -O /dev/null http://127.0.0.1:3001/health 2>/dev/null; then
      echo "Node.js server is ready (attempt $i)"
      break
    fi
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
      echo "Node.js server process exited unexpectedly" >&2
      exit 1
    fi
    sleep 1
  done
fi

# Generate nginx.conf from template, substituting ROOMS_UPSTREAM.
# Only $ROOMS_UPSTREAM is replaced — nginx's own $variables are left intact.
export ROOMS_UPSTREAM
envsubst '$ROOMS_UPSTREAM' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start nginx in foreground (keeps container alive)
exec nginx -g "daemon off;"
