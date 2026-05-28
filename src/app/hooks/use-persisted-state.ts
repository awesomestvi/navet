import { useEffect, useState } from 'react';
import {
  notifyPersistedStateChanged,
  PERSISTED_STATE_EVENT,
} from '../utils/persisted-state-events';
import { storage } from '../utils/storage';

function hasOwnKey(object: Record<string, unknown>, key: string): boolean {
  return Object.keys(object).includes(key);
}

function arePersistedValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => arePersistedValuesEqual(value, right[index]))
    );
  }

  if (typeof left === 'object' && typeof right === 'object') {
    const leftObject = left as Record<string, unknown>;
    const rightObject = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftObject);
    const rightKeys = Object.keys(rightObject);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          hasOwnKey(rightObject, key) && arePersistedValuesEqual(leftObject[key], rightObject[key])
      )
    );
  }

  return false;
}

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
    notifyPersistedStateChanged(key, value);
  }, [key, value]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }

      const nextValue = event.newValue ? (JSON.parse(event.newValue) as T) : defaultValue;
      setValue((previous) => (arePersistedValuesEqual(previous, nextValue) ? previous : nextValue));
    };

    const handlePersistedState = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: T }>;
      if (customEvent.detail?.key !== key) {
        return;
      }

      const nextValue = customEvent.detail.value ?? defaultValue;
      setValue((previous) => (arePersistedValuesEqual(previous, nextValue) ? previous : nextValue));
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
