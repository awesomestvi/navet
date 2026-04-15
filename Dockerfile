FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM --platform=$TARGETPLATFORM nginx:1.27-alpine

RUN apk add --no-cache nodejs

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx.proxy.conf.template /etc/navet-nginx/default.proxy.conf.template
COPY docker/nginx.no-proxy.conf /etc/navet-nginx/default.no-proxy.conf
COPY docker/config.js.template /usr/share/nginx/html/config.js.template
COPY docker/30-navet-config.sh /docker-entrypoint.d/30-navet-config.sh
COPY docker/40-navet-rss-proxy.sh /docker-entrypoint.d/40-navet-rss-proxy.sh
COPY docker/rss-proxy-server.mjs /usr/local/bin/navet-rss-proxy.mjs
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/30-navet-config.sh /docker-entrypoint.d/40-navet-rss-proxy.sh

EXPOSE 80
