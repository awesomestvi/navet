import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { usePersistedState } from '../use-persisted-state';

describe('usePersistedState', () => {
  it('hydrates the initial value from localStorage', () => {
    localStorage.setItem('theme', JSON.stringify('glass'));

    const { result } = renderHookWithProviders(() => usePersistedState('theme', 'dark'));

    expect(result.current[0]).toBe('glass');
  });

  it('persists updates to localStorage', async () => {
    const { result } = renderHookWithProviders(() => usePersistedState('layout', 'grid'));

    act(() => result.current[1]('list'));

    await waitFor(() => expect(localStorage.getItem('layout')).toBe(JSON.stringify('list')));
  });

  it('supports functional updates', async () => {
    const { result } = renderHookWithProviders(() => usePersistedState('count', 1));

    act(() => result.current[1]((value) => value + 1));

    await waitFor(() => expect(result.current[0]).toBe(2));
  });

  it('syncs updates across hooks with the same key', async () => {
    const first = renderHookWithProviders(() => usePersistedState('sync-key', 'a'));
    const second = renderHookWithProviders(() => usePersistedState('sync-key', 'a'));

    act(() => first.result.current[1]('b'));

    await waitFor(() => expect(second.result.current[0]).toBe('b'));
  });

  it('reacts to storage events', async () => {
    const { result } = renderHookWithProviders(() => usePersistedState('units', 'metric'));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'units',
          newValue: JSON.stringify('imperial'),
        })
      );
    });

    await waitFor(() => expect(result.current[0]).toBe('imperial'));
  });
});
