#!/bin/sh
set -eu

NAVET_HASS_URL="${NAVET_HASS_URL:-}"
NAVET_DASHBOARD_CONFIG_URL="${NAVET_DASHBOARD_CONFIG_URL:-}"
NAVET_HASS_URL_JS="$(printf '%s' "${NAVET_HASS_URL}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
NAVET_DASHBOARD_CONFIG_URL_JS="$(printf '%s' "${NAVET_DASHBOARD_CONFIG_URL}" | sed 's/\\/\\\\/g; s/"/\\"/g')"

mkdir -p /data
chown nginx:nginx /data 2>/dev/null || true

case "${NAVET_HASS_URL}" in
  ""|http://*|https://*) ;;
  *)
    echo "NAVET_HASS_URL must be empty or start with http:// or https://" >&2
    exit 1
    ;;
esac

if printf '%s' "${NAVET_HASS_URL}${NAVET_DASHBOARD_CONFIG_URL}" | grep -q '[";'\'']'; then
  echo "NAVET_HASS_URL and NAVET_DASHBOARD_CONFIG_URL must not contain quotes or semicolons" >&2
  exit 1
fi

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

probe_home_assistant_url() {
  url="$1"
  if ! command -v wget >/dev/null 2>&1; then
    return 1
  fi

  wget -q -T 2 -O - "${url}/api/" 2>/dev/null | grep -q 'API running'
}

write_home_assistant_discovery() {
  discovery_candidates=''
  preferred_url=''
  reachable_count=0
  reachable_url=''

  append_discovery_candidate() {
    candidate_url="$1"
    candidate_source="$2"

    case ",${seen_candidate_urls:-}," in
      *,"${candidate_url}",*) return ;;
    esac
    seen_candidate_urls="${seen_candidate_urls:-},${candidate_url}"

    candidate_reachable=false
    if probe_home_assistant_url "${candidate_url}"; then
      candidate_reachable=true
      reachable_count=$((reachable_count + 1))
      reachable_url="${candidate_url}"
    fi

    candidate_json='{"url":"'"$(json_escape "${candidate_url}")"'","source":"'"${candidate_source}"'","reachable":'"${candidate_reachable}"'}'
    if [ -n "${discovery_candidates}" ]; then
      discovery_candidates="${discovery_candidates},${candidate_json}"
    else
      discovery_candidates="${candidate_json}"
    fi
  }

  if [ -n "${NAVET_HASS_URL}" ]; then
    append_discovery_candidate "${NAVET_HASS_URL}" "env"
    preferred_url="${NAVET_HASS_URL}"
  fi

  append_discovery_candidate "http://homeassistant.local:8123" "hostname"
  append_discovery_candidate "http://homeassistant:8123" "hostname"

  if [ -z "${preferred_url}" ] && [ "${reachable_count}" -eq 1 ]; then
    preferred_url="${reachable_url}"
  fi

  {
    printf '{"candidates":[%s]' "${discovery_candidates}"
    if [ -n "${preferred_url}" ]; then
      printf ',"preferredUrl":"%s"' "$(json_escape "${preferred_url}")"
    fi
    printf '}\n'
  } > /usr/share/nginx/html/navet-discovery-home-assistant.json
}

write_home_assistant_discovery

export NAVET_HASS_URL NAVET_HASS_URL_JS NAVET_DASHBOARD_CONFIG_URL_JS

if [ -n "${NAVET_HASS_URL}" ]; then
  envsubst '${NAVET_HASS_URL}' \
    < /etc/navet-nginx/default.proxy.conf.template \
    > /etc/nginx/conf.d/default.conf
else
  cp /etc/navet-nginx/default.no-proxy.conf /etc/nginx/conf.d/default.conf
fi

envsubst '${NAVET_HASS_URL_JS} ${NAVET_DASHBOARD_CONFIG_URL_JS}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js
