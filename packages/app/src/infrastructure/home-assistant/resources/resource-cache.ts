import { LruCache } from '@navet/app/utils/lru-cache';
import type { ResolvedMediaResource } from './resource-types';

const RESOURCE_CACHE_MAX_ENTRIES = 256;

interface CacheEntry {
  expiresAt: number;
  resource: ResolvedMediaResource;
}

export class ResourceCache {
  private entries = new LruCache<string, CacheEntry>(RESOURCE_CACHE_MAX_ENTRIES);

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
