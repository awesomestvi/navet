/**
 * Type-safe localStorage wrapper with error handling and JSON serialization
 */

class LocalStorage {
  /**
   * Get an item from localStorage with a default value
   */
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`[storage] get("${key}") failed:`, error);
      return defaultValue;
    }
  }

  /**
   * Set an item in localStorage
   */
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`[storage] set("${key}") failed:`, error);
    }
  }

  /**
   * Remove an item from localStorage
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`[storage] remove("${key}") failed:`, error);
    }
  }

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.clear();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[storage] clear() failed:', error);
    }
  }

  /**
   * Get all keys from localStorage with an optional prefix filter
   */
  keys(prefix?: string): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const keys = Object.keys(window.localStorage);
      return prefix ? keys.filter((key) => key.startsWith(prefix)) : keys;
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[storage] keys() failed:', error);
      return [];
    }
  }
}

export const storage = new LocalStorage();
