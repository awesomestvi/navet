import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLightBrightnessSync } from '../use-light-brightness-sync';

interface HookProps {
  isOn: boolean;
  providerState?: { value: 'on' | 'off'; brightnessPct: number };
}

vi.mock('@navet/app/hooks', () => ({
  useHaCommandQueue: () => ({
    queue: vi.fn(),
  }),
}));

vi.mock('../../stores/light-memory-store', () => ({
  useLightMemoryStore: {
    getState: () => ({
      getRememberedState: () => undefined,
    }),
  },
}));

describe('useLightBrightnessSync', () => {
  const rememberLightState = vi.fn();
  const setIsOn = vi.fn();
  const syncLight = vi.fn();

  beforeEach(() => {
    rememberLightState.mockReset();
    setIsOn.mockReset();
    syncLight.mockReset();
  });

  it('ignores stale off brightness updates while a local turn-on is pending', () => {
    const pendingOnStateRef = { current: true as boolean | null };

    const { result, rerender } = renderHook<ReturnType<typeof useLightBrightnessSync>, HookProps>(
      ({ isOn, providerState }: HookProps) =>
        useLightBrightnessSync({
          id: 'light.test',
          isOn,
          setIsOn,
          initialBrightness: 100,
          liveEntity: undefined,
          providerState: providerState as never,
          syncLight,
          rememberLightState,
          pendingOnStateRef,
        }),
      {
        initialProps: {
          isOn: true,
          providerState: undefined,
        } satisfies HookProps,
      }
    );

    expect(result.current.brightness).toBe(100);

    rerender({
      isOn: true,
      providerState: { value: 'off', brightnessPct: 100 },
    });

    expect(result.current.brightness).toBe(100);
  });
});
