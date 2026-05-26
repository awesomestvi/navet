#!/usr/bin/with-contenv bashio
set -euo pipefail

CONFIG_DIR="/usr/share/nginx/html"
CONFIG_FILE="${CONFIG_DIR}/config.js"
NGINX_CONF="/etc/nginx/http.d/default.conf"

DASHBOARD_CONFIG_URL="$(bashio::config 'dashboard_config_url')"
RESOLVED_HASS_PROXY_BASE="http://supervisor/core"

mkdir -p /data
chown nginx:nginx /data 2>/dev/null || true

if [[ "${DASHBOARD_CONFIG_URL}" == *\"* || "${DASHBOARD_CONFIG_URL}" == *\'* || "${DASHBOARD_CONFIG_URL}" == *";"* ]]; then
  echo "dashboard_config_url must not contain quotes or semicolons" >&2
  exit 1
fi

DASHBOARD_CONFIG_URL_JS="${DASHBOARD_CONFIG_URL//\\/\\\\}"
DASHBOARD_CONFIG_URL_JS="${DASHBOARD_CONFIG_URL_JS//\"/\\\"}"

cat > "${CONFIG_FILE}" <<EOF
window.__NAVET_CONFIG__ = {
  dashboardConfigUrl: "${DASHBOARD_CONFIG_URL_JS}",
  proxyBaseUrl: "/__navet_ha_proxy__"
};
EOF

PROXY_AUTH_DIRECTIVE=""
if [[ -n "${SUPERVISOR_TOKEN:-}" ]]; then
  PROXY_AUTH_DIRECTIVE='    proxy_set_header Authorization "Bearer '"${SUPERVISOR_TOKEN}"'";'
fi

cat > "${NGINX_CONF}" <<EOF
server {
  listen 8099;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  include /etc/nginx/snippets/navet-security-headers.conf;
  include /etc/nginx/snippets/navet-auth-store.conf;
  include /etc/nginx/snippets/navet-profile-store.conf;

  location = /__navet_ha_proxy__/api/websocket {
    proxy_pass ${RESOLVED_HASS_PROXY_BASE}/websocket;
    proxy_http_version 1.1;
    proxy_set_header Host \$proxy_host;
    proxy_set_header Forwarded "";
    proxy_set_header X-Forwarded-For "";
    proxy_set_header X-Forwarded-Host "";
    proxy_set_header X-Forwarded-Proto "";
    proxy_set_header X-Real-IP "";
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
${PROXY_AUTH_DIRECTIVE}
  }

  location /__navet_ha_proxy__/ {
    if (\$uri ~ "\.\.") {
      return 400;
    }
    proxy_pass ${RESOLVED_HASS_PROXY_BASE}/;
    proxy_http_version 1.1;
    proxy_set_header Host \$proxy_host;
    proxy_set_header Forwarded "";
    proxy_set_header X-Forwarded-For "";
    proxy_set_header X-Forwarded-Host "";
    proxy_set_header X-Forwarded-Proto "";
    proxy_set_header X-Real-IP "";
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
${PROXY_AUTH_DIRECTIVE}
  }

  include /etc/nginx/snippets/navet-rss-proxy.conf;

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
    sub_filter '<link rel="manifest" href="' '<link rel="x-navet-disabled-manifest" href="';
    sub_filter_once on;
    add_header Cache-Control "no-store";
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

nginx -g 'daemon off;'
