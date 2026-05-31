import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCardState } from '../use-card-state';

describe('useCardState', () => {
  it('does not re-persist identical card size events', () => {
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

    renderHook(() => useCardState(devices));
    dispatchSpy.mockClear();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(PERSISTED_STATE_EVENT, {
          detail: {
            key: STORAGE_KEYS.cardSizes,
            value: {
              'home_assistant:light.kitchen': 'small',
            },
          },
        })
      );
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });
});
