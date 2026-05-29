# ── Railway Dockerfile for Sengoku Jidai ──────────────────────────────
# Node 20 ships with a stable npm; we do NOT self-upgrade npm because
# upgrading npm in the same layer it then runs in triggers the
# "Exit handler never called" crash. The bundled npm handles `npm ci` fine.

# ---- Build stage ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

# Install dependencies first (better layer caching). Dev deps are needed
# for the Next.js build, so install everything.
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Bring over the built app and its dependencies.
COPY --from=builder /app ./

EXPOSE 3000

# next start binds to 0.0.0.0 and uses the PORT Railway injects.
CMD ["sh", "-c", "node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
