const XML_CONTENT_TYPE_PATTERN = /(?:^|[/+])(rss|atom|xml)(?:[;+]|$)|^text\/xml(?:[;+]|$)/i;
const PRIVATE_HOSTNAMES = new Set(['localhost', 'localhost.', '0.0.0.0']);

export function isPrivateIpAddress(address: string) {
  const normalizedAddress = address.toLowerCase();
  if (normalizedAddress === '::1' || normalizedAddress === '::') {
    return true;
  }

  if (
    normalizedAddress.startsWith('fc') ||
    normalizedAddress.startsWith('fd') ||
    normalizedAddress.startsWith('fe80:')
  ) {
    return true;
  }

  const parts = normalizedAddress.split('.').map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first = 0, second = 0] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function isBlockedRSSHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return (
    PRIVATE_HOSTNAMES.has(normalizedHostname) ||
    normalizedHostname.endsWith('.local') ||
    isPrivateIpAddress(normalizedHostname)
  );
}

export function isAllowedRSSContentType(contentType: string | null) {
  return Boolean(contentType && XML_CONTENT_TYPE_PATTERN.test(contentType));
}
