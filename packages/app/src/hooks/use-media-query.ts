import { useSyncExternalStore } from 'react';

type MediaQueryStore = {
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

const queryStores = new Map<string, MediaQueryStore>();
const getServerSnapshot = () => false;
const serverStore: MediaQueryStore = {
  getSnapshot: getServerSnapshot,
  subscribe: () => () => {},
};

function getMediaQueryStore(query: string): MediaQueryStore {
  if (typeof window === 'undefined') return serverStore;

  const existing = queryStores.get(query);
  if (existing) return existing;

  const mediaQuery = window.matchMedia(query);
  const listeners = new Set<() => void>();
  const handleChange = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  const store: MediaQueryStore = {
    getSnapshot: () => mediaQuery.matches,
    subscribe: (listener) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        queryStores.set(query, store);
        mediaQuery.addEventListener('change', handleChange);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          mediaQuery.removeEventListener('change', handleChange);
          if (queryStores.get(query) === store) {
            queryStores.delete(query);
          }
        }
      };
    },
  };
  queryStores.set(query, store);
  return store;
}

/** Shares one browser change listener among consumers of the same query. */
export function useMediaQuery(query: string): boolean {
  const store = getMediaQueryStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}
