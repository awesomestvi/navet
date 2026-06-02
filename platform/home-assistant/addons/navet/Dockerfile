ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20
ARG BUILD_VERSION=dev
ARG BUILD_ARCH=amd64
ARG NAVET_GIT_SHA=local
ARG NAVET_BUILD_DATE=1970-01-01T00:00:00.000Z
ARG NAVET_RELEASE_CHANNEL=development

FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
ARG NAVET_ENABLE_DEMO=false
ARG NAVET_GIT_SHA
ARG NAVET_BUILD_DATE
ARG NAVET_RELEASE_CHANNEL

ENV NAVET_GIT_SHA=$NAVET_GIT_SHA
ENV NAVET_BUILD_DATE=$NAVET_BUILD_DATE
ENV NAVET_RELEASE_CHANNEL=$NAVET_RELEASE_CHANNEL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN NAVET_ENABLE_DEMO=$NAVET_ENABLE_DEMO pnpm build

FROM ${BUILD_FROM}
ARG BUILD_VERSION
ARG BUILD_ARCH

RUN apk add --no-cache bash nginx nginx-mod-http-js

COPY platform/home-assistant/addons/navet/run.sh /run.sh
COPY platform/home-assistant/addons/navet/rootfs/ /
COPY docker/njs/rss-proxy.js /etc/nginx/njs/rss-proxy.js
COPY docker/njs/profile-store.js /etc/nginx/njs/profile-store.js
COPY docker/njs/auth-store.js /etc/nginx/njs/auth-store.js
COPY docker/njs/openhab-store.js /etc/nginx/njs/openhab-store.js
COPY docker/njs/openhab-proxy.js /etc/nginx/njs/openhab-proxy.js
COPY docker/njs/homey-store.js /etc/nginx/njs/homey-store.js
COPY docker/njs/homey-proxy.js /etc/nginx/njs/homey-proxy.js
COPY docker/snippets/navet-rss-proxy.conf /etc/nginx/snippets/navet-rss-proxy.conf
COPY docker/snippets/navet-profile-store.conf /etc/nginx/snippets/navet-profile-store.conf
COPY docker/snippets/navet-auth-store.conf /etc/nginx/snippets/navet-auth-store.conf
COPY docker/snippets/navet-openhab-store.conf /etc/nginx/snippets/navet-openhab-store.conf
COPY docker/snippets/navet-homey-store.conf /etc/nginx/snippets/navet-homey-store.conf
COPY docker/snippets/navet-discovery.conf /etc/nginx/snippets/navet-discovery.conf
COPY docker/snippets/navet-security-headers.conf /etc/nginx/snippets/navet-security-headers.conf
COPY --from=build /app/apps/standalone/dist /usr/share/nginx/html

RUN mkdir -p /data \
  && chown -R nginx:nginx /data \
  && chmod a+x /run.sh

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="addon" \
  io.hass.arch="${BUILD_ARCH}"

EXPOSE 8099

CMD ["/run.sh"]
