const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:avif|bmp|gif|jpeg|jpg|png|svg\+xml|webp);/i;

function parseUrl(value: string, baseUrl?: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
  } catch {
    return null;
  }
}

export function sanitizeExternalUrl(
  value: string | null | undefined,
  baseUrl?: string
): string | null {
  if (!value) {
    return null;
  }

  const url = parseUrl(value, baseUrl);
  if (!url || !HTTP_PROTOCOLS.has(url.protocol)) {
    return null;
  }

  return url.toString();
}

export function sanitizeImageUrl(
  value: string | null | undefined,
  baseUrl?: string,
  options: { allowBlob?: boolean; allowDataImage?: boolean } = {}
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (options.allowBlob && trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (options.allowDataImage && IMAGE_DATA_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return sanitizeExternalUrl(trimmed, baseUrl);
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

export function isSafeRelativePath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  try {
    const path = value.split(/[?#]/, 1)[0] ?? '';
    const decodedPath = decodeURIComponent(path);
    return (
      !decodedPath.startsWith('//') &&
      !decodedPath.includes('\\') &&
      !hasControlCharacter(decodedPath) &&
      !decodedPath.split('/').includes('..')
    );
  } catch {
    return false;
  }
}
