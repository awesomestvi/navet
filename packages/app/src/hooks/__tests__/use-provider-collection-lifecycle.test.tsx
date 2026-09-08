import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useHydratingProviderCollection,
  useProviderCollectionData,
} from '../use-provider-collection-lifecycle';

let refresh: () => Promise<void>;
const unsubscribe = vi.fn();
vi.mock('@navet/app/utils/visibility-aware-scheduler', () => ({
  subscribeVisibilityAwareAsyncTask: (task: () => Promise<void>) => {
    refresh = task;
    return unsubscribe;
  },
}));
const empty: string[] = [];

describe('provider collection lifecycle', () => {
  beforeEach(() => unsubscribe.mockClear());

  it('retains successful data on failure and ignores a superseded provider request', async () => {
    const load = vi.fn<() => Promise<string[]>>().mockResolvedValue(['forecast']);
    let providerId: 'home_assistant' | 'homey' = 'home_assistant';
    const { result, rerender } = renderHook(() =>
      useProviderCollectionData({
        providerId,
        enabled: true,
        interval: 1000,
        empty,
        load,
      })
    );
    await act(async () => refresh());
    expect(result.current).toEqual(['forecast']);
    load.mockRejectedValueOnce(new Error('offline'));
    await act(async () => refresh());
    expect(result.current).toEqual(['forecast']);

    let resolve: (value: string[]) => void = () => {};
    load.mockReturnValueOnce(
      new Promise<string[]>((done) => {
        resolve = done;
      })
    );
    const pending = refresh();
    providerId = 'homey';
    rerender();
    expect(result.current).toEqual([]);
    await act(async () => {
      resolve(['old provider']);
      await pending;
    });
    expect(result.current).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('retains reconnecting collections only for their own provider', () => {
    let providerId: 'home_assistant' | 'homey' = 'home_assistant';
    let devices = ['weather'];
    const { result, rerender } = renderHook(() =>
      useHydratingProviderCollection(providerId, devices, true, false, empty)
    );
    devices = empty;
    rerender();
    expect(result.current).toEqual(['weather']);
    providerId = 'homey';
    rerender();
    expect(result.current).toEqual([]);
  });
});
