#!/bin/sh
set -eu

NAVET_HASS_URL="${NAVET_HASS_URL:-}"
NAVET_OPENHAB_URL="${NAVET_OPENHAB_URL:-}"
NAVET_INSTALLATION_KEY="${NAVET_INSTALLATION_KEY:-}"
NAVET_DASHBOARD_CONFIG_URL="${NAVET_DASHBOARD_CONFIG_URL:-}"
NAVET_HASS_URL_JS="$(printf '%s' "${NAVET_HASS_URL}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
NAVET_DASHBOARD_CONFIG_URL_JS="$(printf '%s' "${NAVET_DASHBOARD_CONFIG_URL}" | sed 's/\\/\\\\/g; s/"/\\"/g')"

mkdir -p /data
chown nginx:nginx /data 2>/dev/null || true

INSTALLATION_KEY_PATH="/data/navet-installation-key"
INSTALLATION_CONFIG_PATH="/data/navet-installation-config.json"
PAIRING_KEY_CREATED=false

if [ -n "${NAVET_INSTALLATION_KEY}" ]; then
  if ! printf '%s' "${NAVET_INSTALLATION_KEY}" | grep -Eq '^[a-f0-9]{64}$'; then
    echo "NAVET_INSTALLATION_KEY must contain exactly 64 lowercase hexadecimal characters" >&2
    exit 1
  fi
  printf '%s\n' "${NAVET_INSTALLATION_KEY}" > "${INSTALLATION_KEY_PATH}.tmp"
  chmod 600 "${INSTALLATION_KEY_PATH}.tmp"
  mv "${INSTALLATION_KEY_PATH}.tmp" "${INSTALLATION_KEY_PATH}"
elif [ -f "${INSTALLATION_KEY_PATH}" ]; then
  NAVET_INSTALLATION_KEY="$(tr -d '\r\n' < "${INSTALLATION_KEY_PATH}")"
  if ! printf '%s' "${NAVET_INSTALLATION_KEY}" | grep -Eq '^[a-f0-9]{64}$'; then
    echo "${INSTALLATION_KEY_PATH} is invalid; refusing to replace installation authority" >&2
    exit 1
  fi
else
  NAVET_INSTALLATION_KEY="$(
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  )"
  printf '%s\n' "${NAVET_INSTALLATION_KEY}" > "${INSTALLATION_KEY_PATH}.tmp"
  chmod 600 "${INSTALLATION_KEY_PATH}.tmp"
  mv "${INSTALLATION_KEY_PATH}.tmp" "${INSTALLATION_KEY_PATH}"
  PAIRING_KEY_CREATED=true
fi
chmod 600 "${INSTALLATION_KEY_PATH}"
chown nginx:nginx "${INSTALLATION_KEY_PATH}" 2>/dev/null || true

write_runtime_resolver() {
  resolver_addresses="$(
    awk '
      $1 == "nameserver" && $2 ~ /^[0-9A-Fa-f:.]+$/ {
        if (index($2, ":") > 0) {
          printf "[%s] ", $2
        } else {
          printf "%s ", $2
        }
      }
    ' /etc/resolv.conf
  )"
  if [ -z "${resolver_addresses}" ]; then
    echo "No usable runtime DNS resolver found in /etc/resolv.conf" >&2
    exit 1
  fi
  printf 'resolver %svalid=30s ipv6=off;\n' "${resolver_addresses}" \
    > /etc/nginx/resolver.conf
}

write_runtime_resolver

case "${NAVET_ALLOW_INSECURE_PROVIDER_TLS:-false}" in
  true|1|yes)
    NAVET_PROVIDER_TLS_VERIFY=off
    echo "WARNING: provider TLS certificate verification is explicitly disabled" >&2
    ;;
  false|0|no|"")
    NAVET_PROVIDER_TLS_VERIFY=on
    ;;
  *)
    echo "NAVET_ALLOW_INSECURE_PROVIDER_TLS must be true or false" >&2
    exit 1
    ;;
esac

case "${NAVET_HASS_URL}" in
  ""|http://*|https://*) ;;
  *)
    echo "NAVET_HASS_URL must be empty or start with http:// or https://" >&2
    exit 1
    ;;
esac

case "${NAVET_OPENHAB_URL}" in
  ""|http://*|https://*) ;;
  *)
    echo "NAVET_OPENHAB_URL must be empty or start with http:// or https://" >&2
    exit 1
    ;;
esac

if printf '%s' "${NAVET_HASS_URL}${NAVET_OPENHAB_URL}${NAVET_DASHBOARD_CONFIG_URL}" | grep -q '[";'\'']'; then
  echo "Navet URL settings must not contain quotes or semicolons" >&2
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

{
  printf '{"version":1,"hassUrl":'
  if [ -n "${NAVET_HASS_URL}" ]; then
    printf '"%s"' "$(json_escape "${NAVET_HASS_URL}")"
  else
    printf 'null'
  fi
  printf ',"openhabUrl":'
  if [ -n "${NAVET_OPENHAB_URL}" ]; then
    printf '"%s"' "$(json_escape "${NAVET_OPENHAB_URL}")"
  else
    printf 'null'
  fi
  printf '}\n'
} > "${INSTALLATION_CONFIG_PATH}.tmp"
chmod 600 "${INSTALLATION_CONFIG_PATH}.tmp"
mv "${INSTALLATION_CONFIG_PATH}.tmp" "${INSTALLATION_CONFIG_PATH}"
chown nginx:nginx "${INSTALLATION_CONFIG_PATH}" 2>/dev/null || true

if [ "${PAIRING_KEY_CREATED}" = "true" ]; then
  echo "Navet operator pairing key created." >&2
  echo "Append #navet_pairing=${NAVET_INSTALLATION_KEY} to your trusted Navet URL for first enrollment." >&2
  echo "The fragment remains browser-local and is removed before Navet sends network requests." >&2
fi

export NAVET_HASS_URL NAVET_HASS_URL_JS NAVET_DASHBOARD_CONFIG_URL_JS NAVET_PROVIDER_TLS_VERIFY

envsubst '${NAVET_HASS_URL}' \
  < /etc/navet-nginx/ha-proxy.template.js \
  > /etc/nginx/njs/ha-proxy.js

envsubst '${NAVET_PROVIDER_TLS_VERIFY}' \
  < /etc/navet-nginx/default.conf \
  > /etc/nginx/conf.d/default.conf

envsubst '${NAVET_HASS_URL_JS} ${NAVET_DASHBOARD_CONFIG_URL_JS}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js
