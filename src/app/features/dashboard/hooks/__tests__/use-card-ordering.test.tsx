import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { createEmptyDeviceCollection } from '@/app/hooks/use-ha-devices.helpers';
import { PERSISTED_STATE_EVENT } from '@/app/utils/persisted-state-events';
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
});
