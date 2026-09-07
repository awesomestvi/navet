/** Pure host classification shared by resource proxies across Node and njs. */
function parseIpv4(address: string): number[] | null {
  const parts = address.split('.');
  if (parts.length > 4 || parts.some((part) => !/^(?:0x[\da-f]+|\d+)$/i.test(part))) return null;
  const values = parts.map((part) => {
    if (/^0x/i.test(part)) return Number.parseInt(part.slice(2), 16);
    if (part.length > 1 && part[0] === '0') {
      return /^[0-7]+$/.test(part) ? Number.parseInt(part, 8) : Number.NaN;
    }
    return Number(part);
  });
  const last = values[values.length - 1];
  if (last === undefined || !Number.isFinite(last) || last >= 256 ** (5 - values.length))
    return null;
  if (values.slice(0, -1).some((value) => !Number.isFinite(value) || value > 255)) return null;
  let numeric = last;
  for (let index = 0; index < values.length - 1; index++)
    numeric += (values[index] ?? 0) * 256 ** (3 - index);
  return [
    Math.floor(numeric / 16777216),
    Math.floor(numeric / 65536) % 256,
    Math.floor(numeric / 256) % 256,
    numeric % 256,
  ];
}

function isPrivateIpv4(parts: number[]): boolean {
  const first = parts[0] ?? 0;
  const second = parts[1] ?? 0;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function parseIpv6(address: string): number[] | null {
  let value = address;
  if (value.includes('.')) {
    const separator = value.lastIndexOf(':');
    const ipv4 = parseIpv4(value.slice(separator + 1));
    if (!ipv4) return null;
    value = `${value.slice(0, separator)}:${((ipv4[0] ?? 0) * 256 + (ipv4[1] ?? 0)).toString(16)}:${((ipv4[2] ?? 0) * 256 + (ipv4[3] ?? 0)).toString(16)}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const words = left.concat(right);
  if (words.some((word) => !/^[\da-f]{1,4}$/i.test(word))) return null;
  if (halves.length === 1 && words.length !== 8) return null;
  if (halves.length === 2 && words.length >= 8) return null;
  return left
    .concat(Array(8 - words.length).fill('0'), right)
    .map((word) => Number.parseInt(word, 16));
}

export function isPrivateResourceIpAddress(address: string): boolean {
  const normalized =
    address
      .toLowerCase()
      .replace(/^\[|\]$/g, '')
      .split('%')[0] ?? '';
  if (!normalized.includes(':')) {
    const ipv4 = parseIpv4(normalized);
    return ipv4 !== null && isPrivateIpv4(ipv4);
  }
  const words = parseIpv6(normalized);
  if (!words) return false;
  const first = words[0] ?? 0;
  if (
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xffc0) === 0xfec0 ||
    (first & 0xff00) === 0xff00
  )
    return true;
  if (words.slice(0, 7).every((word) => word === 0) && (words[7] ?? 0) <= 1) return true;
  // IPv4-mapped and IPv4-compatible literals retain the embedded address's policy.
  if (words.slice(0, 5).every((word) => word === 0) && (words[5] === 0xffff || words[5] === 0)) {
    const high = words[6] ?? 0;
    const low = words[7] ?? 0;
    return isPrivateIpv4([high >> 8, high & 255, low >> 8, low & 255]);
  }
  return false;
}

export function isBlockedResourceHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    isPrivateResourceIpAddress(normalized)
  );
}

export function isAllowedResourceXmlContentType(contentType: string | null): boolean {
  return Boolean(
    contentType && /(?:^|[/+])(rss|atom|xml)(?:[;+]|$)|^text\/xml(?:[;+]|$)/i.test(contentType)
  );
}
