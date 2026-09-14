import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  createEmptyDeviceCollection,
  mapNavetEntitiesToDeviceCollection,
} from '@navet/app/core/navet-device-collections';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { storage } from '@navet/app/utils/storage';
import type { NavetEntity } from '@navet/core/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCardState } from '../use-card-state';

function createLivingRoomDevices() {
  return mapNavetEntitiesToDeviceCollection(
    (['climate', 'media_player'] as const).map(
      (type): NavetEntity => ({
        id: `homey:${type}`,
        canonicalId: `homey:${type}`,
        providerId: 'homey',
        externalId: type,
        type,
        name: type,
        room: 'Living Room',
        primaryState: 'idle',
        availability: 'available',
        attributes: {},
        capabilities: [],
      })
    )
  );
}

describe('useCardState', () => {
  it('uses medium for arriving climate and speaker cards without persisting defaults', () => {
    const { result, rerender } = renderHook((devices) => useCardState(devices), {
      initialProps: createEmptyDeviceCollection(),
    });
    rerender(createLivingRoomDevices());

    expect(result.current.cardSizes).toEqual({
      'homey:climate': 'medium',
      'homey:media_player': 'medium',
    });
    expect(storage.get(STORAGE_KEYS.cardSizes, null)).toEqual({});
  });

  it('remembers small and large choices through device updates and remounts', () => {
    const devices = createLivingRoomDevices();
    const { result, rerender, unmount } = renderHook((value) => useCardState(value), {
      initialProps: devices,
    });
    act(() => {
      result.current.updateCardSize('homey:climate', 'small');
      result.current.updateCardSize('homey:media_player', 'large');
    });
    rerender(createEmptyDeviceCollection());
    rerender(createLivingRoomDevices());
    unmount();

    const restored = renderHook(() => useCardState(devices));
    expect(restored.result.current.cardSizes).toEqual({
      'homey:climate': 'small',
      'homey:media_player': 'large',
    });
  });

  it('does not re-persist identical card size events', () => {
    storage.set(STORAGE_KEYS.cardSizes, { 'home_assistant:light.kitchen': 'small' });
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
