import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { storage } from '@navet/app/utils/storage';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCardOrdering } from '../use-card-ordering';

describe('useCardOrdering', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.cardOrders);
  });

  it('does not re-persist identical card order events', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const devices = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'home_assistant:light.kitchen',
          canonicalId: 'home_assistant:light.kitchen',
          nativeId: 'light.kitchen',
          providerId: 'home_assistant' as const,
          name: 'Kitchen Light',
          room: 'Kitchen',
          size: 'small' as const,
          state: true,
          brightness: 100,
          temp: 3200,
        },
      ],
    };

    renderHook(() => useCardOrdering(devices, ['Kitchen']));
    dispatchSpy.mockClear();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(PERSISTED_STATE_EVENT, {
          detail: {
            key: STORAGE_KEYS.cardOrders,
            value: {
              Kitchen: ['home_assistant:light.kitchen'],
            },
          },
        })
      );
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps card ordering stable across state-only entity updates', () => {
    const rooms = ['Kitchen'];
    const customCards: [] = [];
    const light = {
      id: 'home_assistant:light.kitchen',
      canonicalId: 'home_assistant:light.kitchen',
      nativeId: 'light.kitchen',
      providerId: 'home_assistant' as const,
      name: 'Kitchen Light',
      room: 'Kitchen',
      size: 'small' as const,
      state: true,
      brightness: 100,
      temp: 3200,
    };
    const { result, rerender } = renderHook(
      ({ brightness }: { brightness: number }) =>
        useCardOrdering(
          {
            ...createEmptyDeviceCollection(),
            lights: [{ ...light, brightness }],
          },
          rooms,
          customCards
        ),
      { initialProps: { brightness: 100 } }
    );
    const firstCardOrders = result.current.cardOrders;

    rerender({ brightness: 35 });

    expect(result.current.cardOrders).toBe(firstCardOrders);
  });

  it('preserves saved positions while room entities hydrate incrementally', () => {
    const firstLight = {
      id: 'home_assistant:light.first',
      canonicalId: 'home_assistant:light.first',
      nativeId: 'light.first',
      providerId: 'home_assistant' as const,
      name: 'First light',
      room: 'Kitchen',
      size: 'small' as const,
      state: true,
      brightness: 100,
      temp: 3200,
    };
    const secondLight = {
      ...firstLight,
      id: 'home_assistant:light.second',
      canonicalId: 'home_assistant:light.second',
      nativeId: 'light.second',
      name: 'Second light',
    };
    const savedOrder = [secondLight.id, firstLight.id];
    storage.set(STORAGE_KEYS.cardOrders, { Kitchen: savedOrder });

    const { result, rerender } = renderHook(
      ({ includeSecond }: { includeSecond: boolean }) =>
        useCardOrdering(
          {
            ...createEmptyDeviceCollection(),
            lights: includeSecond ? [firstLight, secondLight] : [firstLight],
          },
          ['Kitchen']
        ),
      { initialProps: { includeSecond: false } }
    );

    expect(result.current.cardOrders.Kitchen).toEqual(savedOrder);

    rerender({ includeSecond: true });

    expect(result.current.cardOrders.Kitchen).toEqual(savedOrder);
    expect(storage.get(STORAGE_KEYS.cardOrders, {})).toEqual({ Kitchen: savedOrder });
  });

  it('adds newly discovered entities in a stable order', () => {
    const createLight = (id: string) => ({
      id,
      canonicalId: id,
      nativeId: id.replace('home_assistant:', ''),
      providerId: 'home_assistant' as const,
      name: id,
      room: 'Kitchen',
      size: 'small' as const,
      state: true,
      brightness: 100,
      temp: 3200,
    });

    const { result } = renderHook(() =>
      useCardOrdering(
        {
          ...createEmptyDeviceCollection(),
          lights: [
            createLight('home_assistant:light.zebra'),
            createLight('home_assistant:light.alpha'),
          ],
        },
        ['Kitchen']
      )
    );

    expect(result.current.cardOrders.Kitchen).toEqual([
      'home_assistant:light.alpha',
      'home_assistant:light.zebra',
    ]);
  });
});
