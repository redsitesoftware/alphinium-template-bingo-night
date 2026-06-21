#!/bin/sh
# Single-pod startup: run Node.js server + nginx in one container.
# nginx proxies /rooms (and WebSocket upgrades) to the local Node.js process
# on port 3001, so only one pod needs to stay alive.
set -e

# Ensure nginx log dirs exist (needed on node:alpine base)
mkdir -p /var/log/nginx /var/lib/nginx/tmp /run

# Start Node.js server in background
node /server/index.js &
NODE_PID=$!

# Wait for Node.js to be ready (poll /health on port 3001, max 30s)
echo "Waiting for Node.js server to be ready..."
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://127.0.0.1:3001/health 2>/dev/null; then
    echo "Node.js server is ready (attempt $i)"
    break
  fi
  # If Node process has exited, fail fast
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "Node.js server process exited unexpectedly" >&2
    exit 1
  fi
  sleep 1
done

# Start nginx in foreground (keeps container alive)
exec nginx -g "daemon off;"
