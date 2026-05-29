# Railway hard-fix Dockerfile for Sengoku Jidai
# Uses Node 20 and installs all dependencies in one stage so Next.js cannot disappear between stages.
FROM node:20-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Install dependencies first for better Docker caching.
COPY package.json package-lock.json* ./

# Use npm install instead of npm ci to avoid Railway/cache/lockfile edge cases.
# Keep dev dependencies during build because Next/TypeScript tooling may need them.
RUN npm install --include=dev --legacy-peer-deps --no-audit --no-fund \
  && test -f ./node_modules/next/dist/bin/next \
  && node ./node_modules/next/dist/bin/next --version

COPY . .

# Build directly through the local Next binary instead of relying on shell PATH.
RUN node ./node_modules/next/dist/bin/next build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npm run start"]
