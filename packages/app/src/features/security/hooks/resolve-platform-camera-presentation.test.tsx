import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePlatformCameraPresentation } from './resolve-platform-camera-presentation';

const { useCameraPlaybackPlanMock } = vi.hoisted(() => ({
  useCameraPlaybackPlanMock: vi.fn(),
}));

vi.mock('./use-camera-playback-plan', () => ({
  useCameraPlaybackPlan: useCameraPlaybackPlanMock,
}));

describe('usePlatformCameraPresentation', () => {
  it('prefers the latest snapshot URL over a stale playback-plan snapshot resource', () => {
    useCameraPlaybackPlanMock.mockReturnValue({
      primary: {
        id: 'camera.front:snapshot',
        kind: 'image',
        cacheKey: 'camera.front:snapshot',
        authStrategy: 'same_origin',
        url: '/api/camera_proxy/camera.front?_t=0',
      },
      fallbacks: [],
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    const { result } = renderHook(() =>
      usePlatformCameraPresentation({
        entityId: 'camera.front',
        preferredMode: 'auto',
        preferredTransport: 'auto',
        snapshotUrl: '/api/camera_proxy/camera.front?_t=1',
        mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=1',
        frontendStreamTypes: [],
        hasGo2RtcFeed: false,
        isUnavailable: false,
        isRunning: true,
        failedTransports: new Set(),
      })
    );

    expect(result.current.sourceKind).toBe('snapshot');
    expect(result.current.sourceUrl).toBe('/api/camera_proxy/camera.front?_t=1');
  });

  it('prefers the latest MJPEG URL over a stale playback-plan stream resource', () => {
    useCameraPlaybackPlanMock.mockReturnValue({
      primary: {
        id: 'camera.front:mjpeg',
        kind: 'mjpeg_stream',
        cacheKey: 'camera.front:mjpeg',
        authStrategy: 'same_origin',
        url: '/api/camera_proxy_stream/camera.front?_t=0',
      },
      fallbacks: [],
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    const { result } = renderHook(() =>
      usePlatformCameraPresentation({
        entityId: 'camera.front',
        preferredMode: 'live',
        preferredTransport: 'auto',
        snapshotUrl: '/api/camera_proxy/camera.front?_t=1',
        mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=1',
        frontendStreamTypes: [],
        hasGo2RtcFeed: false,
        isUnavailable: false,
        isRunning: true,
        failedTransports: new Set(['web_rtc', 'hls']),
      })
    );

    expect(result.current.sourceKind).toBe('mjpeg');
    expect(result.current.sourceUrl).toBe('/api/camera_proxy_stream/camera.front?_t=1');
  });
});
