import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCardOrdering } from '../use-card-ordering';

describe('useCardOrdering', () => {
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
});
