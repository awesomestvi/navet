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
  it('returns an empty snapshot presentation while playback is loading', () => {
    useCameraPlaybackPlanMock.mockReturnValue(null);

    const { result } = renderHook(() =>
      usePlatformCameraPresentation({
        entityId: 'home_assistant:camera.front',
        cameraState: 'idle',
        preferredMode: 'auto',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    expect(result.current).toEqual({
      sourceUrl: undefined,
      sourceKind: 'snapshot',
      isFallback: false,
      videoStreamKind: null,
      supportsStreaming: false,
      availableStreamTypes: [],
    });
  });

  it('maps native WebRTC playback models to a viewer presentation', () => {
    useCameraPlaybackPlanMock.mockReturnValue({
      cameraState: 'streaming',
      snapshotResource: null,
      supportsSnapshot: false,
      liveTransports: ['web_rtc'],
      fallbackTransports: [],
      selectedTransport: 'web_rtc',
      selectedStreamResource: null,
      supportsStreaming: true,
      isSnapshotFallback: false,
      shouldStartWithSnapshot: false,
      motionDetectionEnabled: true,
      refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    const { result } = renderHook(() =>
      usePlatformCameraPresentation({
        entityId: 'home_assistant:camera.front',
        cameraState: 'streaming',
        preferredMode: 'live',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    expect(result.current).toEqual({
      sourceUrl: undefined,
      sourceKind: 'web_rtc',
      isFallback: false,
      videoStreamKind: 'web_rtc',
      supportsStreaming: true,
      availableStreamTypes: ['web_rtc'],
    });
  });

  it('maps snapshot fallback playback models to a snapshot presentation', () => {
    useCameraPlaybackPlanMock.mockReturnValue({
      cameraState: 'streaming',
      snapshotResource: {
        id: 'camera.front:snapshot',
        kind: 'image',
        cacheKey: 'camera.front:snapshot',
        authStrategy: 'same_origin',
        url: '/api/camera_proxy/camera.front',
      },
      supportsSnapshot: true,
      liveTransports: [],
      fallbackTransports: [],
      selectedTransport: null,
      selectedStreamResource: null,
      supportsStreaming: false,
      isSnapshotFallback: true,
      shouldStartWithSnapshot: true,
      motionDetectionEnabled: true,
      refreshPolicy: { snapshotRefreshMs: 30_000, retryDelaysMs: [1_000, 3_000, 7_000] },
    });

    const { result } = renderHook(() =>
      usePlatformCameraPresentation({
        entityId: 'home_assistant:camera.front',
        cameraState: 'streaming',
        preferredMode: 'live',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: false,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    expect(result.current).toEqual({
      sourceUrl: '/api/camera_proxy/camera.front',
      sourceKind: 'snapshot',
      isFallback: true,
      videoStreamKind: null,
      supportsStreaming: false,
      availableStreamTypes: [],
    });
  });
});
