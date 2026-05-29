# Railway deployment for Sengoku Jidai
# Supabase JS requires Node 20+, so this Dockerfile forces Node 20.
FROM node:20-bullseye-slim AS deps

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./

# Install all dependencies. Do not set deprecated npm production config.
# next is needed during build.
RUN npm ci --no-audit --no-fund

FROM node:20-bullseye-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "npm run start"]
