import { useEffect, useState } from 'react';
import { storage } from '../utils/storage';

const PERSISTED_STATE_EVENT = 'navet:persisted-state';

/**
 * Custom hook for persisting state to localStorage
 *
 * @param key - The localStorage key
 * @param defaultValue - The default value if nothing is stored
 * @returns [value, setValue] tuple similar to useState
 *
 * @example
 * const [theme, setTheme] = usePersistedState('theme', 'dark');
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    return storage.get(key, defaultValue);
  });

  useEffect(() => {
    storage.set(key, value);
    window.dispatchEvent(new CustomEvent(PERSISTED_STATE_EVENT, { detail: { key, value } }));
  }, [key, value]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }

      setValue(event.newValue ? JSON.parse(event.newValue) : defaultValue);
    };

    const handlePersistedState = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: T }>;
      if (customEvent.detail?.key !== key) {
        return;
      }

      setValue(customEvent.detail.value ?? defaultValue);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
    };
  }, [defaultValue, key]);

  return [value, setValue];
}
