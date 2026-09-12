#!/bin/sh
set -eu

SETUP_CODE_PATH="${NAVET_SETUP_CODE_PATH:-/data/navet-setup-code.json}"
SETUP_CODE_RAW="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
SETUP_CODE="$(printf '%s' "${SETUP_CODE_RAW}" | sed 's/\(....\)\(....\)\(....\)\(....\)/\1-\2-\3-\4/')"
SETUP_CODE_EXPIRES_AT="$(( $(date +%s) * 1000 + 600000 ))"

printf '{"version":1,"code":"%s","expiresAt":%s}\n' \
  "${SETUP_CODE}" "${SETUP_CODE_EXPIRES_AT}" > "${SETUP_CODE_PATH}.tmp"
chmod 600 "${SETUP_CODE_PATH}.tmp"
mv "${SETUP_CODE_PATH}.tmp" "${SETUP_CODE_PATH}"
chown nginx:nginx "${SETUP_CODE_PATH}" 2>/dev/null || true

echo "Navet setup code: ${SETUP_CODE}"
echo "This code works once and expires in 10 minutes."
