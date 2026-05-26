import type { ResolvedMediaResource } from './resource-types';

interface CacheEntry {
  expiresAt: number;
  resource: ResolvedMediaResource;
}

export class ResourceCache {
  private entries = new Map<string, CacheEntry>();

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.resource;
  }

  set(key: string, resource: ResolvedMediaResource, ttlMs: number) {
    this.entries.set(key, {
      expiresAt: Date.now() + ttlMs,
      resource,
    });
  }
}
