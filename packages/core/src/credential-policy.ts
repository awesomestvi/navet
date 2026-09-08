// Shared secret detection for configuration export and persistence.
// Deliberately independent of URL/URLSearchParams, which are absent in Nginx njs.
export function isCredentialFieldName(value: string): boolean {
  const normalized = String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (
    normalized.indexOf('token') >= 0 ||
    normalized.indexOf('password') >= 0 ||
    normalized.indexOf('passwd') >= 0 ||
    normalized.indexOf('passcode') >= 0 ||
    normalized.indexOf('jwt') >= 0 ||
    normalized.indexOf('secret') >= 0 ||
    normalized.indexOf('credential') >= 0 ||
    normalized === 'key' ||
    normalized === 'sig' ||
    normalized === 'pin' ||
    normalized === 'code' ||
    normalized === 'authorization' ||
    normalized === 'auth' ||
    normalized === 'authsig' ||
    normalized.indexOf('signature') >= 0 ||
    normalized === 'bearer' ||
    normalized === 'accesskey' ||
    normalized === 'accesscode' ||
    normalized === 'privatekey' ||
    normalized.slice(Math.max(0, normalized.length - 6)) === 'apikey' ||
    (normalized.indexOf('api') === 0 &&
      normalized.slice(Math.max(0, normalized.length - 3)) === 'key')
  );
}

function containsCredentialParameters(value: string): boolean {
  const parts = String(value || '').split(/[&;]/);
  for (let index = 0; index < parts.length; index += 1) {
    let parameterName = parts[index].split('=')[0] || '';
    const questionIndex = parameterName.lastIndexOf('?');
    if (questionIndex >= 0) {
      parameterName = parameterName.slice(questionIndex + 1);
    }
    try {
      parameterName = decodeURIComponent(parameterName.replace(/\+/g, ' '));
    } catch (_error) {
      // Keep the undecoded name and apply the same conservative check.
    }
    if (isCredentialFieldName(parameterName)) {
      return true;
    }
  }
  return false;
}

export function isCredentialBearingUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const candidate = value.replace(/[\t\r\n]/g, '').trim();
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\/[^/?#]*@/i.test(candidate)) {
    return true;
  }

  const hashIndex = candidate.indexOf('#');
  const queryIndex = candidate.indexOf('?');
  if (queryIndex >= 0 && (hashIndex < 0 || queryIndex < hashIndex)) {
    const queryEnd = hashIndex >= 0 ? hashIndex : candidate.length;
    if (containsCredentialParameters(candidate.slice(queryIndex + 1, queryEnd))) {
      return true;
    }
  }

  if (hashIndex >= 0) {
    let fragment = candidate.slice(hashIndex + 1);
    const fragmentQueryIndex = fragment.indexOf('?');
    if (fragmentQueryIndex >= 0) {
      fragment = fragment.slice(fragmentQueryIndex + 1);
    }
    if (containsCredentialParameters(fragment)) {
      return true;
    }
  }

  return false;
}
