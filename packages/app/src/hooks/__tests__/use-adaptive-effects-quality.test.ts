import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSettingsState = vi.hoisted(() => ({
  effectsQuality: 'high' as 'high' | 'medium' | 'low',
  effectsQualityUserOverride: false,
  updateSettings: vi.fn(),
}));
const mockDeviceState = vi.hoisted(() => ({
  tier: 'high' as 'high' | 'medium' | 'low',
}));

vi.mock('@navet/app/stores/selectors', () => ({
  settingsSelectors: {
    updateSettings: (state: typeof mockSettingsState) => state.updateSettings,
  },
}));

vi.mock('@navet/app/stores/settings-store', () => {
  const useSettingsStore = Object.assign(
    (selector: (state: typeof mockSettingsState) => unknown) => selector(mockSettingsState),
    {
      getState: () => mockSettingsState,
    }
  );

  return { useSettingsStore };
});

vi.mock('@navet/app/utils/detect-device-tier', () => ({
  detectDeviceTier: () => mockDeviceState.tier,
}));

import {
  capEffectsQualityToDeviceTier,
  resolveInteractionEffectsQuality,
  resolveMeasuredEffectsQuality,
  useAdaptiveEffectsQuality,
} from '../use-adaptive-effects-quality';

describe('adaptive effects quality', () => {
  it('keeps high quality for consistently delivered frames', () => {
    expect(resolveMeasuredEffectsQuality(Array.from({ length: 90 }, () => 16.7))).toBe('high');
  });

  it('selects medium when a small share of frames miss the 20 ms budget', () => {
    const frames = Array.from({ length: 90 }, (_, index) => (index < 6 ? 22 : 16.7));
    expect(resolveMeasuredEffectsQuality(frames)).toBe('medium');
  });

  it('selects low when sustained frames exceed the smooth-interaction budget', () => {
    expect(resolveMeasuredEffectsQuality(Array.from({ length: 90 }, () => 34))).toBe('low');
  });

  it('never upgrades beyond the detected hardware tier', () => {
    expect(capEffectsQualityToDeviceTier('high', 'medium')).toBe('medium');
    expect(capEffectsQualityToDeviceTier('medium', 'low')).toBe('low');
  });

  it('accounts for interaction-to-first-frame responsiveness separately from steady frames', () => {
    const steadyFrames = Array.from({ length: 60 }, () => 16.7);

    expect(resolveInteractionEffectsQuality(steadyFrames, 16)).toBe('high');
    expect(resolveInteractionEffectsQuality(steadyFrames, 30)).toBe('medium');
    expect(resolveInteractionEffectsQuality(steadyFrames, 60)).toBe('low');
  });
});

interface FrameScheduler {
  advanceTime: (duration: number) => void;
  pendingCount: () => number;
  runSample: (durations: readonly number[]) => void;
}

function installFrameScheduler(): FrameScheduler {
  let nextFrameId = 1;
  let frameTime = 0;
  const callbacks = new Map<number, FrameRequestCallback>();

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const frameId = nextFrameId;
    nextFrameId += 1;
    callbacks.set(frameId, callback);
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
    callbacks.delete(frameId);
  });
  vi.spyOn(performance, 'now').mockImplementation(() => frameTime);

  const runNextFrame = () => {
    const next = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!next) {
      throw new Error('Expected an animation frame to be scheduled');
    }

    const [frameId, callback] = next;
    callbacks.delete(frameId);
    callback(frameTime);
  };

  return {
    advanceTime: (duration) => {
      frameTime += duration;
    },
    pendingCount: () => callbacks.size,
    runSample: (durations) => {
      runNextFrame();
      for (const duration of durations) {
        frameTime += duration;
        runNextFrame();
      }
    },
  };
}

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

describe('useAdaptiveEffectsQuality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibilityState('visible');
    mockSettingsState.effectsQuality = 'high';
    mockSettingsState.effectsQualityUserOverride = false;
    mockDeviceState.tier = 'high';
    mockSettingsState.updateSettings.mockReset();
    mockSettingsState.updateSettings.mockImplementation((settings) => {
      Object.assign(mockSettingsState, settings);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('downgrades after interaction frames reveal jank missed by the initial sample', () => {
    const scheduler = installFrameScheduler();
    renderHook(() => useAdaptiveEffectsQuality('home'));

    act(() => {
      vi.advanceTimersByTime(250);
      scheduler.runSample(Array.from({ length: 90 }, () => 16.7));
    });
    expect(mockSettingsState.updateSettings).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event('wheel'));
      scheduler.runSample(Array.from({ length: 60 }, () => 34));
    });

    expect(mockSettingsState.updateSettings).toHaveBeenCalledExactlyOnceWith({
      effectsQuality: 'low',
    });
  });

  it('downgrades when the interaction handler delays the first rendered frame', () => {
    const scheduler = installFrameScheduler();
    renderHook(() => useAdaptiveEffectsQuality('home'));

    act(() => {
      vi.advanceTimersByTime(250);
      scheduler.runSample(Array.from({ length: 90 }, () => 16.7));
      window.dispatchEvent(new Event('pointerdown'));
      scheduler.advanceTime(60);
      scheduler.runSample(Array.from({ length: 60 }, () => 16.7));
    });

    expect(mockSettingsState.updateSettings).toHaveBeenCalledExactlyOnceWith({
      effectsQuality: 'low',
    });
  });

  it('uses passive interaction listeners, bounds repeat samples, and cleans listeners up', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const scheduler = installFrameScheduler();
    const { unmount } = renderHook(() => useAdaptiveEffectsQuality('home'));

    const eventNames = ['pointerdown', 'touchstart', 'wheel', 'scroll'] as const;
    for (const eventName of eventNames) {
      expect(addEventListener).toHaveBeenCalledWith(
        eventName,
        expect.any(Function),
        expect.objectContaining({ passive: true })
      );
    }

    act(() => {
      vi.advanceTimersByTime(250);
      scheduler.runSample(Array.from({ length: 90 }, () => 16.7));
      window.dispatchEvent(new Event('pointerdown'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      scheduler.runSample(Array.from({ length: 60 }, () => 16.7));
      window.dispatchEvent(new Event('wheel'));
    });
    expect(scheduler.pendingCount()).toBe(0);

    act(() => {
      vi.advanceTimersByTime(15_000);
      scheduler.advanceTime(15_000);
      window.dispatchEvent(new Event('wheel'));
    });
    expect(scheduler.pendingCount()).toBe(1);

    unmount();
    for (const eventName of eventNames) {
      const addCall = addEventListener.mock.calls.find(([name]) => name === eventName);
      expect(addCall).toBeDefined();
      expect(removeEventListener).toHaveBeenCalledWith(eventName, addCall?.[1], addCall?.[2]);
    }
    expect(scheduler.pendingCount()).toBe(0);
  });

  it('disables all frame sampling and interaction listeners for a user override', () => {
    mockSettingsState.effectsQualityUserOverride = true;
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame');

    renderHook(() => useAdaptiveEffectsQuality('home'));
    act(() => {
      vi.advanceTimersByTime(30_000);
      window.dispatchEvent(new Event('wheel'));
    });

    const interactionEvents = new Set(['pointerdown', 'touchstart', 'wheel', 'scroll']);
    expect(
      addEventListener.mock.calls.some(([eventName]) => interactionEvents.has(eventName))
    ).toBe(false);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(mockSettingsState.updateSettings).not.toHaveBeenCalled();
  });

  it('does not sample on an automatic low-tier device that is already at low quality', () => {
    mockDeviceState.tier = 'low';
    mockSettingsState.effectsQuality = 'low';
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame');

    renderHook(() => useAdaptiveEffectsQuality('home'));
    act(() => {
      vi.advanceTimersByTime(30_000);
      window.dispatchEvent(new Event('wheel'));
    });

    const interactionEvents = new Set(['pointerdown', 'touchstart', 'wheel', 'scroll']);
    expect(
      addEventListener.mock.calls.some(([eventName]) => interactionEvents.has(eventName))
    ).toBe(false);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(mockSettingsState.updateSettings).not.toHaveBeenCalled();
  });

  it('keeps healthy interaction samples from resetting navigation upgrade progress', () => {
    mockSettingsState.effectsQuality = 'low';
    const scheduler = installFrameScheduler();
    const { rerender } = renderHook(({ sampleKey }) => useAdaptiveEffectsQuality(sampleKey), {
      initialProps: { sampleKey: 'home-1' },
    });

    const completeHealthyNavigationAndInteraction = () => {
      act(() => {
        vi.advanceTimersByTime(250);
        scheduler.runSample(Array.from({ length: 90 }, () => 16.7));
        window.dispatchEvent(new Event('wheel'));
        scheduler.runSample(Array.from({ length: 60 }, () => 16.7));
      });
    };

    completeHealthyNavigationAndInteraction();
    rerender({ sampleKey: 'home-2' });
    completeHealthyNavigationAndInteraction();
    expect(mockSettingsState.updateSettings).not.toHaveBeenCalled();

    rerender({ sampleKey: 'home-3' });
    act(() => {
      vi.advanceTimersByTime(250);
      scheduler.runSample(Array.from({ length: 90 }, () => 16.7));
    });

    expect(mockSettingsState.updateSettings).toHaveBeenCalledExactlyOnceWith({
      effectsQuality: 'high',
    });
  });

  it('cancels an active sample when the tab becomes hidden', () => {
    const scheduler = installFrameScheduler();
    renderHook(() => useAdaptiveEffectsQuality('home'));

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      setVisibilityState('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('wheel'));
    });

    expect(scheduler.pendingCount()).toBe(0);
    expect(mockSettingsState.updateSettings).not.toHaveBeenCalled();

    act(() => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(scheduler.pendingCount()).toBe(1);
  });

  it('starts the initial sample after a tab mounted while hidden becomes visible', () => {
    setVisibilityState('hidden');
    const scheduler = installFrameScheduler();
    renderHook(() => useAdaptiveEffectsQuality('home'));

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(scheduler.pendingCount()).toBe(0);

    act(() => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(scheduler.pendingCount()).toBe(1);
  });

  it('runs a delayed initial sample after an early interaction sample finishes', () => {
    const scheduler = installFrameScheduler();
    renderHook(() => useAdaptiveEffectsQuality('home'));

    act(() => {
      window.dispatchEvent(new Event('wheel'));
      vi.advanceTimersByTime(250);
    });
    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      scheduler.runSample(Array.from({ length: 60 }, () => 16.7));
    });
    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      scheduler.runSample(Array.from({ length: 90 }, () => 16.7));
    });
    expect(scheduler.pendingCount()).toBe(0);
  });
});
