# Railway deployment for Sengoku Jidai
# Supabase JS requires Node 20+, so this Dockerfile forces Node 20.
FROM node:20-bullseye-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./

# Install ALL dependencies during build. Next is needed here.
# The extra npm config/cache commands avoid Railway cache/lock issues.
RUN npm config set production false \
  && npm cache clean --force \
  && npm ci --include=dev --no-audit --no-fund \
  && npm exec next -- --version

COPY . .

RUN NEXT_TELEMETRY_DISABLED=1 npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["sh", "-c", "npm run start"]
