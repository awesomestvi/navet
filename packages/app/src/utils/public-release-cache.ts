type CachedRelease<T> = { value: T; checkedAt: string };

export function loadReleaseCache<T>(
  key: string,
  parse: (value: unknown) => T
): CachedRelease<T> | null {
  try {
    const raw = localStorage.getItem(`navet-release-feed:v1:${key}`);
    if (!raw || raw.length > 2_000_000) return null;
    const cached = JSON.parse(raw);
    if (
      typeof cached.checkedAt !== 'string' ||
      !Number.isFinite(Date.parse(cached.checkedAt)) ||
      Date.parse(cached.checkedAt) > Date.now()
    )
      return null;
    return { value: parse(cached.value), checkedAt: cached.checkedAt };
  } catch {
    return null;
  }
}

export function saveReleaseCache(key: string, value: unknown, checkedAt: string): void {
  try {
    const raw = JSON.stringify({ value, checkedAt });
    if (raw.length <= 2_000_000) localStorage.setItem(`navet-release-feed:v1:${key}`, raw);
  } catch {
    // Browser storage is optional; a successful network response remains usable.
  }
}
