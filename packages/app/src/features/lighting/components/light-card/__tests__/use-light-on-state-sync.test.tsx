import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLightOnStateSync } from '../use-light-on-state-sync';

interface HookProps {
  liveEntity?: { state: 'on' | 'off' };
  providerValue?: 'on' | 'off';
}

describe('useLightOnStateSync', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores a stale off update briefly after a local turn-on request', () => {
    vi.useFakeTimers();
    const setIsOn = vi.fn();
    const pendingOnStateRef = { current: true as boolean | null };
    const pendingOnStateTimeoutRef = {
      current: setTimeout(() => {
        pendingOnStateRef.current = null;
        pendingOnStateTimeoutRef.current = null;
      }, 2500) as ReturnType<typeof setTimeout> | null,
    };

    const { rerender } = renderHook<void, HookProps>(
      ({ liveEntity, providerValue }: HookProps) =>
        useLightOnStateSync({
          initialState: false,
          liveEntity: liveEntity as never,
          providerState: providerValue ? ({ value: providerValue } as never) : undefined,
          setIsOn,
          pendingOnStateRef,
          pendingOnStateTimeoutRef,
        }),
      {
        initialProps: {
          liveEntity: undefined,
          providerValue: 'off' as const,
        } satisfies HookProps,
      }
    );

    expect(setIsOn).not.toHaveBeenCalled();

    rerender({
      liveEntity: { state: 'on' as const },
      providerValue: 'off' as const,
    });

    expect(setIsOn).toHaveBeenCalledWith(true);
    expect(pendingOnStateRef.current).toBeNull();
  });
});
