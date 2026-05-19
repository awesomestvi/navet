FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM --platform=$TARGETPLATFORM nginx:1.27-alpine

COPY docker/nginx.main.conf /etc/nginx/nginx.conf
COPY docker/njs/rss-proxy.js /etc/nginx/njs/rss-proxy.js
COPY docker/njs/profile-store.js /etc/nginx/njs/profile-store.js
COPY docker/njs/session-store.js /etc/nginx/njs/session-store.js
COPY docker/snippets/navet-rss-proxy.conf /etc/nginx/snippets/navet-rss-proxy.conf
COPY docker/snippets/navet-profile-store.conf /etc/nginx/snippets/navet-profile-store.conf
COPY docker/snippets/navet-session-store.conf /etc/nginx/snippets/navet-session-store.conf
COPY docker/snippets/navet-security-headers.conf /etc/nginx/snippets/navet-security-headers.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx.proxy.conf.template /etc/navet-nginx/default.proxy.conf.template
COPY docker/nginx.no-proxy.conf /etc/navet-nginx/default.no-proxy.conf
COPY docker/config.js.template /usr/share/nginx/html/config.js.template
COPY docker/30-navet-config.sh /docker-entrypoint.d/30-navet-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /data \
  && chown -R nginx:nginx /data \
  && chmod +x /docker-entrypoint.d/30-navet-config.sh

EXPOSE 80
