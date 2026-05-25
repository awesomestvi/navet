import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetKeepDeviceAwakeForTests,
  activateKeepDeviceAwakeFallback,
  useKeepDeviceAwake,
  useKeepDeviceAwakeSnapshot,
} from '../use-keep-device-awake';

interface AudioMock {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  loop: boolean;
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
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    loop: false,
    preload: 'none',
    playsInline: false,
    crossOrigin: null,
    src: '',
  } satisfies AudioMock;
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
      await activateKeepDeviceAwakeFallback();
    });

    await waitFor(() => expect(result.current.mode).toBe('audio-fallback'));
    expect(result.current.canActivateFallback).toBe(false);
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
});
