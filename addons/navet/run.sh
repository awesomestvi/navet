#!/usr/bin/with-contenv bashio
set -euo pipefail

CONFIG_DIR="/usr/share/nginx/html"
CONFIG_FILE="${CONFIG_DIR}/config.js"
NGINX_CONF="/etc/nginx/http.d/default.conf"

HASS_URL="$(bashio::config 'hass_url')"
HASS_TOKEN="$(bashio::config 'token')"

cat > "${CONFIG_FILE}" <<EOF
window.__NAVET_CONFIG__ = {
  hassUrl: "${HASS_URL}",
  token: "${HASS_TOKEN}"
};
EOF

if [[ -n "${HASS_URL}" ]]; then
  PROXY_AUTH_DIRECTIVE=""
  if [[ -n "${HASS_TOKEN}" ]]; then
    PROXY_AUTH_DIRECTIVE='    proxy_set_header Authorization "Bearer '"${HASS_TOKEN}"'";'
  fi

  cat > "${NGINX_CONF}" <<EOF
server {
  listen 8099;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location /__navet_ha_proxy__/ {
    proxy_pass ${HASS_URL}/;
    proxy_http_version 1.1;
    proxy_set_header Host \$proxy_host;
${PROXY_AUTH_DIRECTIVE}
  }

  location = /__navet_rss_proxy__ {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    add_header Cache-Control "no-store" always;
  }

  location = /config.js {
    add_header Cache-Control "no-store";
    try_files \$uri =404;
  }

  location /assets/ {
    try_files \$uri =404;
  }

  location ~* \.(?:js|mjs|css|map|png|svg|ico|webmanifest)$ {
    try_files \$uri =404;
  }

  location / {
    sub_filter '<head>' '<head><base href="\$http_x_ingress_path/">';
    sub_filter_once on;
    add_header Cache-Control "no-store";
    try_files \$uri \$uri/ /index.html;
  }
}
EOF
fi

node /usr/local/bin/navet-rss-proxy.mjs &

nginx -g 'daemon off;'
