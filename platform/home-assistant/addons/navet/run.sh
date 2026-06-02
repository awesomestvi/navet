#!/usr/bin/with-contenv bashio
set -euo pipefail

CONFIG_DIR="/usr/share/nginx/html"
CONFIG_FILE="${CONFIG_DIR}/config.js"
NGINX_CONF="/etc/nginx/http.d/default.conf"

DASHBOARD_CONFIG_URL="$(bashio::config 'dashboard_config_url')"
HOMEY_CLIENT_ID="$(bashio::config 'homey_client_id')"
HOMEY_CLIENT_SECRET="$(bashio::config 'homey_client_secret')"
HOMEY_REDIRECT_URI="$(bashio::config 'homey_redirect_uri')"
RESOLVED_HASS_PROXY_BASE="http://supervisor/core"

mkdir -p /data
chown nginx:nginx /data 2>/dev/null || true

export NAVET_HOMEY_CLIENT_ID="${HOMEY_CLIENT_ID}"
export NAVET_HOMEY_CLIENT_SECRET="${HOMEY_CLIENT_SECRET}"
export NAVET_HOMEY_REDIRECT_URI="${HOMEY_REDIRECT_URI}"

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
  include /etc/nginx/snippets/navet-homey-store.conf;
  include /etc/nginx/snippets/navet-openhab-store.conf;
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

  location /__navet_homey_proxy__/ {
    if (\$uri ~ "\.\.") {
      return 400;
    }
    js_set \$navet_homey_proxy_url navet_homey_proxy.upstream_url;
    js_set \$navet_homey_proxy_auth_header navet_homey_proxy.authorization_header;

    if (\$navet_homey_proxy_url = "") {
      return 502;
    }

    proxy_pass \$navet_homey_proxy_url;
    proxy_http_version 1.1;
    proxy_set_header Host \$proxy_host;
    proxy_set_header Forwarded "";
    proxy_set_header X-Forwarded-For "";
    proxy_set_header X-Forwarded-Host "";
    proxy_set_header X-Forwarded-Proto "";
    proxy_set_header X-Real-IP "";
    proxy_set_header Authorization \$navet_homey_proxy_auth_header;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }

  location /__navet_openhab_proxy__/ {
    if (\$uri ~ "\.\.") {
      return 400;
    }
    js_set \$navet_openhab_proxy_url navet_openhab_proxy.upstream_url;
    js_set \$navet_openhab_proxy_auth_header navet_openhab_proxy.authorization_header;

    if (\$navet_openhab_proxy_url = "") {
      return 502;
    }

    add_header Cache-Control "no-store" always;
    proxy_pass \$navet_openhab_proxy_url;
    proxy_http_version 1.1;
    proxy_set_header Host \$proxy_host;
    proxy_set_header Forwarded "";
    proxy_set_header X-Forwarded-For "";
    proxy_set_header X-Forwarded-Host "";
    proxy_set_header X-Forwarded-Proto "";
    proxy_set_header X-Real-IP "";
    proxy_set_header Authorization \$navet_openhab_proxy_auth_header;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
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
