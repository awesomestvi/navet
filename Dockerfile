FROM alpine:3.20 AS navet-ai-inference
ARG LLAMA_CPP_RELEASE=b9630
RUN apk add --no-cache build-base cmake linux-headers wget
WORKDIR /src
RUN wget -qO- "https://github.com/ggml-org/llama.cpp/archive/refs/tags/${LLAMA_CPP_RELEASE}.tar.gz" | tar -xz --strip-components=1
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF -DLLAMA_CURL=OFF -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_TOOLS=ON -DLLAMA_BUILD_EXAMPLES=OFF \
  && cmake --build build --target llama-cli --parallel 2

FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
ARG NAVET_ENABLE_DEMO=false
ARG NAVET_VERSION=0.0.0
ARG NAVET_GIT_SHA=local
ARG NAVET_BUILD_DATE=unknown
ARG NAVET_RELEASE_CHANNEL=development
ARG NAVET_BUILD_VERSION

ENV NAVET_GIT_SHA=$NAVET_GIT_SHA
ENV NAVET_BUILD_DATE=$NAVET_BUILD_DATE
ENV NAVET_RELEASE_CHANNEL=$NAVET_RELEASE_CHANNEL
ENV NAVET_BUILD_VERSION=${NAVET_BUILD_VERSION:-${NAVET_VERSION}}

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
COPY services services
RUN NAVET_ENABLE_DEMO=$NAVET_ENABLE_DEMO pnpm build
RUN pnpm exec esbuild services/navet-ai/server.ts --bundle --platform=node --format=esm --outfile=/app/navet-ai-server.mjs --external:node:*

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

RUN apk add --no-cache nodejs su-exec libstdc++

COPY docker/nginx.main.conf /etc/nginx/nginx.conf
COPY docker/resolver.conf /etc/nginx/resolver.conf
COPY docker/njs/rss-proxy.js /etc/nginx/njs/rss-proxy.js
COPY docker/njs/profile-store.js /etc/nginx/njs/profile-store.js
COPY docker/njs/chore-store.js /etc/nginx/njs/chore-store.js
COPY docker/njs/ai-gateway.js /etc/nginx/njs/ai-gateway.js
COPY docker/njs/auth-store.js /etc/nginx/njs/auth-store.js
COPY docker/njs/provider-session-store.js /etc/nginx/njs/provider-session-store.js
COPY docker/njs/installation-authority.js /etc/nginx/njs/installation-authority.js
COPY docker/njs/installation-cookie-scope.js /etc/nginx/njs/installation-cookie-scope.js
COPY docker/njs/openhab-store.js /etc/nginx/njs/openhab-store.js
COPY docker/njs/openhab-proxy.js /etc/nginx/njs/openhab-proxy.js
COPY docker/njs/homey-store.js /etc/nginx/njs/homey-store.js
COPY docker/njs/homey-proxy.js /etc/nginx/njs/homey-proxy.js
COPY docker/njs/ha-proxy.template.js /etc/navet-nginx/ha-proxy.template.js
COPY docker/snippets/navet-rss-proxy.conf /etc/nginx/snippets/navet-rss-proxy.conf
COPY docker/snippets/navet-profile-store.conf /etc/nginx/snippets/navet-profile-store.conf
COPY docker/snippets/navet-chore-store.conf /etc/nginx/snippets/navet-chore-store.conf
COPY docker/snippets/navet-ai.conf /etc/nginx/snippets/navet-ai.conf
COPY docker/snippets/navet-auth-store.conf /etc/nginx/snippets/navet-auth-store.conf
COPY docker/snippets/navet-openhab-store.conf /etc/nginx/snippets/navet-openhab-store.conf
COPY docker/snippets/navet-homey-store.conf /etc/nginx/snippets/navet-homey-store.conf
COPY docker/snippets/navet-discovery.conf /etc/nginx/snippets/navet-discovery.conf
COPY docker/snippets/navet-security-headers.conf /etc/nginx/snippets/navet-security-headers.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/navet-nginx/default.conf
COPY docker/config.js.template /usr/share/nginx/html/config.js.template
COPY docker/30-navet-config.sh /docker-entrypoint.d/30-navet-config.sh
COPY docker/31-navet-ai.sh /docker-entrypoint.d/31-navet-ai.sh
COPY --from=build /app/navet-ai-server.mjs /opt/navet/navet-ai-server.mjs
COPY --from=navet-ai-inference /src/build/bin/llama-cli /usr/local/bin/llama-cli
COPY --from=build /app/apps/standalone/dist /usr/share/nginx/html

RUN mkdir -p /data \
  && chown -R nginx:nginx /data \
  && chmod +x /docker-entrypoint.d/30-navet-config.sh /docker-entrypoint.d/31-navet-ai.sh

VOLUME ["/data"]

EXPOSE 80
