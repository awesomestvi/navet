FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
ARG NAVET_ENABLE_DEMO=false
ARG NAVET_VERSION=0.0.0
ARG NAVET_GIT_SHA=local
ARG NAVET_BUILD_DATE=unknown
ARG NAVET_RELEASE_CHANNEL=development

ENV NAVET_GIT_SHA=$NAVET_GIT_SHA
ENV NAVET_BUILD_DATE=$NAVET_BUILD_DATE
ENV NAVET_RELEASE_CHANNEL=$NAVET_RELEASE_CHANNEL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/standalone/package.json apps/standalone/package.json
COPY packages/app/package.json packages/app/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/provider-homeassistant/package.json packages/provider-homeassistant/package.json
COPY packages/provider-homey/package.json packages/provider-homey/package.json
COPY packages/provider-hubitat/package.json packages/provider-hubitat/package.json
COPY packages/provider-openhab/package.json packages/provider-openhab/package.json
COPY packages/provider-smartthings/package.json packages/provider-smartthings/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.node.json postcss.config.mjs vite.config.ts ./
COPY apps/standalone apps/standalone
COPY packages packages
COPY assets assets
COPY scripts scripts
RUN NAVET_ENABLE_DEMO=$NAVET_ENABLE_DEMO pnpm build

FROM nginx:1.27-alpine

ARG NAVET_VERSION=0.0.0
ARG NAVET_GIT_SHA=local
ARG NAVET_BUILD_DATE=unknown
ARG NAVET_RELEASE_CHANNEL=development
ARG NAVET_SOURCE=https://github.com/awesomestvi/navet

LABEL org.opencontainers.image.title="Navet" \
  org.opencontainers.image.description="Provider-neutral smart-home dashboard for Home Assistant, Homey, and openHAB." \
  org.opencontainers.image.version=$NAVET_VERSION \
  org.opencontainers.image.revision=$NAVET_GIT_SHA \
  org.opencontainers.image.created=$NAVET_BUILD_DATE \
  org.opencontainers.image.source=$NAVET_SOURCE \
  io.navet.release-channel=$NAVET_RELEASE_CHANNEL

COPY docker/nginx.main.conf /etc/nginx/nginx.conf
COPY docker/njs/rss-proxy.js /etc/nginx/njs/rss-proxy.js
COPY docker/njs/profile-store.js /etc/nginx/njs/profile-store.js
COPY docker/njs/auth-store.js /etc/nginx/njs/auth-store.js
COPY docker/njs/openhab-store.js /etc/nginx/njs/openhab-store.js
COPY docker/njs/openhab-proxy.js /etc/nginx/njs/openhab-proxy.js
COPY docker/njs/homey-store.js /etc/nginx/njs/homey-store.js
COPY docker/njs/homey-proxy.js /etc/nginx/njs/homey-proxy.js
COPY docker/njs/ha-proxy.template.js /etc/navet-nginx/ha-proxy.template.js
COPY docker/snippets/navet-rss-proxy.conf /etc/nginx/snippets/navet-rss-proxy.conf
COPY docker/snippets/navet-profile-store.conf /etc/nginx/snippets/navet-profile-store.conf
COPY docker/snippets/navet-auth-store.conf /etc/nginx/snippets/navet-auth-store.conf
COPY docker/snippets/navet-openhab-store.conf /etc/nginx/snippets/navet-openhab-store.conf
COPY docker/snippets/navet-homey-store.conf /etc/nginx/snippets/navet-homey-store.conf
COPY docker/snippets/navet-discovery.conf /etc/nginx/snippets/navet-discovery.conf
COPY docker/snippets/navet-security-headers.conf /etc/nginx/snippets/navet-security-headers.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/navet-nginx/default.conf
COPY docker/config.js.template /usr/share/nginx/html/config.js.template
COPY docker/30-navet-config.sh /docker-entrypoint.d/30-navet-config.sh
COPY --from=build /app/apps/standalone/dist /usr/share/nginx/html

RUN mkdir -p /data \
  && chown -R nginx:nginx /data \
  && chmod +x /docker-entrypoint.d/30-navet-config.sh

EXPOSE 80
