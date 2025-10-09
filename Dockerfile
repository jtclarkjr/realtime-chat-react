FROM imbios/bun-node:20-slim AS deps
ARG DEBIAN_FRONTEND=noninteractive

# Asia/Tokyo timezone,
RUN apt-get -y update && \
  apt-get install -yq openssl git ca-certificates tzdata python3 build-essential && \
  ln -fs /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  dpkg-reconfigure -f noninteractive tzdata
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the app
FROM deps AS builder
WORKDIR /app

# Copy environment file for build
COPY .env .env.production

COPY . .

# Set ENV=dev to enable standalone output
ENV ENV=dev
RUN bun run build


# Production image, copy all the files and run next
FROM node:20-slim AS runner

# Install Redis
RUN apt-get update && \
    apt-get install -yq redis-server && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create startup script
RUN echo '#!/bin/sh\n\
redis-server --daemonize yes --dir /data --appendonly yes\n\
echo "Redis started"\n\
exec node server.js' > /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3001 6379

ENV PORT 3001

CMD ["/app/start.sh"]
