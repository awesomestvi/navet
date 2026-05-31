import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetKeepDeviceAwakeForTests,
  activateKeepDeviceAwakeFallback,
  useKeepDeviceAwake,
  useKeepDeviceAwakeSnapshot,
} from '../use-keep-device-awake';

interface AudioMock {
  addEventListener: EventTarget['addEventListener'];
  removeEventListener: EventTarget['removeEventListener'];
  dispatchEvent: EventTarget['dispatchEvent'];
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  loop: boolean;
  paused: boolean;
  preload: string;
  playsInline: boolean;
  crossOrigin: string | null;
  src: string;
}

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

function createAudioMock() {
  const target = new EventTarget() as EventTarget & AudioMock;
  target.play = vi.fn().mockImplementation(async () => {
    target.paused = false;
  });
  target.pause = vi.fn().mockImplementation(() => {
    target.paused = true;
    target.dispatchEvent(new Event('pause'));
  });
  target.currentTime = 0;
  target.loop = false;
  target.paused = true;
  target.preload = 'none';
  target.playsInline = false;
  target.crossOrigin = null;
  target.src = '';
  return target;
}

function createWakeLockSentinel() {
  const target = new EventTarget() as EventTarget & {
    released: boolean;
    release: ReturnType<typeof vi.fn>;
  };
  target.released = false;
  target.release = vi.fn().mockImplementation(async () => {
    target.released = true;
    target.dispatchEvent(new Event('release'));
  });
  return target;
}

describe('useKeepDeviceAwake', () => {
  let audioMock: AudioMock;

  beforeEach(() => {
    setVisibilityState('visible');
    audioMock = createAudioMock();
    function MockAudio() {
      return audioMock;
    }
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: MockAudio,
    });
    Object.defineProperty(window.navigator, 'wakeLock', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  afterEach(async () => {
    await __resetKeepDeviceAwakeForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses screen wake lock when the browser supports it', async () => {
    const sentinel = createWakeLockSentinel();
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(window.navigator, 'wakeLock', {
      configurable: true,
      writable: true,
      value: { request },
    });

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('wake-lock'));
    expect(request).toHaveBeenCalledWith('screen');
    expect(audioMock.play).not.toHaveBeenCalled();
  });

  it('falls back to silent audio when wake lock fails', async () => {
    const request = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    Object.defineProperty(window.navigator, 'wakeLock', {
      configurable: true,
      writable: true,
      value: { request },
    });

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
    expect(audioMock.play).toHaveBeenCalledTimes(1);
  });

  it('shows pending activation when autoplay blocks the audio fallback', async () => {
    audioMock.play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('pending-activation'));
    expect(result.current.canActivateFallback).toBe(true);

    audioMock.play.mockResolvedValueOnce(undefined);
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
    expect(result.current.canActivateFallback).toBe(false);
  });

  it('recovers pending activation from the first keyboard interaction', async () => {
    audioMock.play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('pending-activation'));

    audioMock.play.mockResolvedValueOnce(undefined);
    await act(async () => {
      window.dispatchEvent(new Event('keydown'));
    });

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
  });

  it('keeps manual activation available as a secondary fallback path', async () => {
    audioMock.play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('pending-activation'));

    audioMock.play.mockResolvedValueOnce(undefined);
    await act(async () => {
      await activateKeepDeviceAwakeFallback();
    });

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
  });

  it('stops fallback audio and resets status when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));

    await act(async () => {
      rerender({ enabled: false });
    });

    await waitFor(() => expect(result.current.mode).toBe('disabled'));
    expect(audioMock.pause).toHaveBeenCalled();
  });

  it('re-acquires wake lock after the page becomes visible again', async () => {
    const request = vi.fn().mockResolvedValue(createWakeLockSentinel());
    Object.defineProperty(window.navigator, 'wakeLock', {
      configurable: true,
      writable: true,
      value: { request },
    });

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('wake-lock'));
    expect(request).toHaveBeenCalledTimes(1);

    await act(async () => {
      setVisibilityState('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('re-acquires wake lock when the browser releases the sentinel', async () => {
    const sentinel = createWakeLockSentinel();
    const replacementSentinel = createWakeLockSentinel();
    const request = vi
      .fn()
      .mockResolvedValueOnce(sentinel)
      .mockResolvedValueOnce(replacementSentinel);
    Object.defineProperty(window.navigator, 'wakeLock', {
      configurable: true,
      writable: true,
      value: { request },
    });

    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('wake-lock'));
    expect(request).toHaveBeenCalledTimes(1);

    await act(async () => {
      sentinel.dispatchEvent(new Event('release'));
    });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('restarts fallback audio if it pauses unexpectedly', async () => {
    const { result } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
    expect(audioMock.play).toHaveBeenCalledTimes(1);

    await act(async () => {
      audioMock.paused = true;
      audioMock.dispatchEvent(new Event('pause'));
    });

    await waitFor(() => expect(audioMock.play).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
  });

  it('tears down gesture recovery when disabled', async () => {
    audioMock.play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeepDeviceAwake(enabled);
        return useKeepDeviceAwakeSnapshot();
      },
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.mode).toBe('pending-activation'));
    expect(audioMock.play).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ enabled: false });
    });

    await waitFor(() => expect(result.current.mode).toBe('disabled'));

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });

    expect(audioMock.play).toHaveBeenCalledTimes(1);
  });
});
