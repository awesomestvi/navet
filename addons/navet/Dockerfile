ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20
ARG BUILD_VERSION=dev
ARG BUILD_ARCH=amd64
ARG NAVET_ENABLE_RSS_PROXY=false

FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM ${BUILD_FROM}
ARG BUILD_VERSION
ARG BUILD_ARCH
ARG NAVET_ENABLE_RSS_PROXY

RUN apk add --no-cache bash nginx \
  && if [ "$NAVET_ENABLE_RSS_PROXY" = "true" ]; then apk add --no-cache nodejs; fi

COPY addons/navet/run.sh /run.sh
COPY addons/navet/rootfs/ /
COPY docker/rss-proxy-server.mjs /usr/local/bin/navet-rss-proxy.mjs
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod a+x /run.sh

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="addon" \
  io.hass.arch="${BUILD_ARCH}"

EXPOSE 8099

CMD ["/run.sh"]
