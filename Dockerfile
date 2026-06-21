# Stage 1: build the React Native web bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY react-native/package*.json ./
RUN npm install --legacy-peer-deps
COPY react-native/ .
RUN npx expo export --platform web --output-dir dist

# Stage 2: single runtime image — nginx (frontend) + Node.js (API server)
# Running both processes in one pod eliminates the two-pod expiry problem:
# the Alphinium proxy only needs to keep one pod alive, and nginx keeps it
# active via normal frontend traffic.
FROM node:20-alpine

RUN apk add --no-cache nginx

# Install server production dependencies
WORKDIR /server
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server source
COPY server/ .

# Copy built frontend and nginx config
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Startup script that launches Node then nginx
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]