#!/bin/sh
# Single-pod startup: run Node.js server + nginx in one container.
# nginx proxies /rooms (and WebSocket upgrades) to the local Node.js process
# on port 3001, so only one pod needs to stay alive.
set -e

# Ensure nginx log dirs exist (needed on node:alpine base)
mkdir -p /var/log/nginx /var/lib/nginx/tmp /run

# Start Node.js server in background
node /server/index.js &

# Give Node a moment to start before nginx begins accepting requests
sleep 1

# Start nginx in foreground (keeps container alive)
exec nginx -g "daemon off;"
