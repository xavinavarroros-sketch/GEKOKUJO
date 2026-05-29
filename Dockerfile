# Railway stable Dockerfile for Sengoku Jidai
# Uses Node 20 + npm 11 to avoid Railway/npm install bugs and ensures dev deps exist for Next build.
FROM node:20.19.0-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./

# Upgrade npm to a stable current version for Node 20, then install from lockfile.
RUN npm install -g npm@11.6.0 \
  && npm --version \
  && npm ci --include=dev --legacy-peer-deps --no-audit --no-fund \
  && node -e "require.resolve('next/package.json'); console.log('Next installed:', require('next/package.json').version)"

COPY . .

RUN node ./node_modules/next/dist/bin/next build

FROM node:20.19.0-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
