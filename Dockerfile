# syntax=docker/dockerfile:1

# Vercel Container runtime: runs this Express backend as a long-running server.
# https://vercel.com/docs/functions/container-runtime

FROM node:20-alpine

WORKDIR /app

# better-sqlite3 ships prebuilt binaries for common platforms, but Alpine uses
# musl, so fall back to compiling from source when a prebuild is unavailable.
RUN apk add --no-cache python3 make g++

# Install Node dependencies (cached layer — reruns only when these change).
COPY package*.json ./
RUN npm install

# Copy the rest of the source.
COPY . .

# Run migrations + seed the database at build time so the image has a valid
# schema ready when the server starts.
RUN npm run migrate

# The server binds to PORT (defaults to 3001).
EXPOSE 3001

# Run the server; Vercel container images are long-running processes.
CMD ["node", "server/server.js"]