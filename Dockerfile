# Stage 1: build the React Native web bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY react-native/package*.json ./
RUN npm install --legacy-peer-deps
COPY react-native/ .
# Accept build-time arg for WebSocket host (baked into JS bundle by Expo)
ARG EXPO_PUBLIC_WS_HOST=""
ENV EXPO_PUBLIC_WS_HOST=$EXPO_PUBLIC_WS_HOST
RUN npx expo export --platform web --output-dir dist

# Stage 2: dual-mode runtime image — nginx (frontend) + optional embedded Node.js (API)
#
# Two-pod mode  (EXPO_PUBLIC_ROOM_API_URL is set at deploy time):
#   nginx proxies /rooms to the external server pod; no local Node.js is started.
#   A keep-alive loop in start.sh pings the server pod to prevent Alphinium proxy expiry.
#
# Single-pod mode (EXPO_PUBLIC_ROOM_API_URL is empty — local dev default):
#   The embedded Node.js server starts on port 3001 and nginx proxies /rooms to it.
FROM node:20-alpine

# nginx + gettext (provides envsubst, used by start.sh to expand nginx.conf.template)
RUN apk add --no-cache nginx gettext

# Install server production dependencies
WORKDIR /server
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server source (needed for single-pod / local dev fallback)
COPY server/ .

# Copy built frontend and nginx config template
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Startup script that configures nginx and optionally starts Node.js
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]