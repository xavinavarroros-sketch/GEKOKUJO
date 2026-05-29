# Railway production build for Sengoku Jidai
# Uses Node 20 because Supabase JS 2.106+ requires Node >=20.
FROM node:20-bullseye-slim

WORKDIR /app

# Keep dev dependencies during install/build so Next/TypeScript are available.
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .

# Explicit check: if this fails, dependencies were not installed correctly.
RUN test -f node_modules/.bin/next
RUN npm run build

# Runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
