import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraStreamPlayer } from '../camera-stream-player';

const { getCameraStreamUrlMock, resolveCameraStreamResourceMock } = vi.hoisted(() => ({
  getCameraStreamUrlMock: vi.fn(),
  resolveCameraStreamResourceMock: vi.fn(),
}));

vi.mock('hls.js', () => {
  class MockHls {
    static isSupported = vi.fn(() => true);
    static Events = {
      MEDIA_ATTACHED: 'media_attached',
      MANIFEST_PARSED: 'manifest_parsed',
      LEVEL_LOADED: 'level_loaded',
      FRAG_LOADED: 'frag_loaded',
      ERROR: 'error',
    };
    static ErrorTypes = {
      MEDIA_ERROR: 'mediaError',
      NETWORK_ERROR: 'networkError',
    };

    private attached = false;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    attachMedia = vi.fn(() => {
      this.attached = true;
    });

    on(event: string, handler: (...args: unknown[]) => void) {
      const listeners = this.listeners.get(event) ?? [];
      listeners.push(handler);
      this.listeners.set(event, listeners);
      if (event === MockHls.Events.MEDIA_ATTACHED && this.attached) {
        handler();
      }
      if (event === MockHls.Events.MANIFEST_PARSED) {
        handler();
      }
    }

    loadSource = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();
    destroy = vi.fn();
  }

  return { default: MockHls };
});

vi.mock('@navet/app/services/integration-camera-feature.service', () => ({
  integrationCameraFeatureService: {
    getCameraStreamUrl: getCameraStreamUrlMock,
    getWebRtcClientConfiguration: vi.fn(),
    subscribeCameraWebRtcOffer: vi.fn(),
    addCameraWebRtcCandidate: vi.fn(),
  },
}));

vi.mock('@navet/app/services/integration-camera-runtime.service', () => ({
  resolveCameraStreamResource: resolveCameraStreamResourceMock,
}));

describe('CameraStreamPlayer timeout fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/camera.front/master.m3u8' });
    resolveCameraStreamResourceMock.mockResolvedValue({
      url: '/api/hls/camera.front/master.m3u8',
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(async () => undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'canPlayType', {
      configurable: true,
      value: vi.fn(() => ''),
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('refreshes the HLS URL once before failing when no frame or HLS progress occurs before timeout', async () => {
    const onError = vi.fn();

    render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="hls"
        posterUrl="/api/camera_proxy/camera.front"
        fitMode="cover"
        onError={onError}
      />
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(getCameraStreamUrlMock).toHaveBeenCalledWith('camera.front', 'hls');

    await vi.advanceTimersByTimeAsync(20_000);

    expect(getCameraStreamUrlMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(onError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(20_000);

    expect(onError).toHaveBeenCalledWith('hls');
  });

  it('does not time out an HLS stream that is still making manifest or fragment progress', async () => {
    const onError = vi.fn();

    render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="hls"
        posterUrl="/api/camera_proxy/camera.front"
        fitMode="cover"
        onError={onError}
      />
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(getCameraStreamUrlMock).toHaveBeenCalledWith('camera.front', 'hls');

    await vi.advanceTimersByTimeAsync(19_000);
    expect(onError).not.toHaveBeenCalled();
  });
});
