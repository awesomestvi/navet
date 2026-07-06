import type { PlatformCameraPlaybackModel } from '@navet/app/platform/provider-feature-models';
import { getCameraPlaybackPlan } from '@navet/app/services/integration-camera-runtime.service';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraPlaybackPlan } from './use-camera-playback-plan';

vi.mock('@navet/app/services/integration-camera-runtime.service', () => ({
  getCameraPlaybackPlan: vi.fn(),
}));

const getCameraPlaybackPlanMock = vi.mocked(getCameraPlaybackPlan);

function createProviderHlsPlan(): PlatformCameraPlaybackModel {
  return {
    cameraState: 'streaming',
    snapshotResource: {
      id: 'camera.front:snapshot',
      kind: 'image',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin',
      url: '/api/camera_proxy/camera.front',
    },
    supportsSnapshot: true,
    liveTransports: ['hls'],
    fallbackTransports: [],
    selectedTransport: 'hls',
    selectedStreamResource: {
      id: 'camera.front:hls',
      kind: 'hls_stream',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin',
      url: '/api/hls/camera.front/master.m3u8',
    },
    supportsStreaming: true,
    isSnapshotFallback: false,
    shouldStartWithSnapshot: false,
    motionDetectionEnabled: true,
    refreshPolicy: { retryDelaysMs: [1_000, 3_000, 7_000] },
  };
}

describe('useCameraPlaybackPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCameraPlaybackPlanMock.mockResolvedValue(createProviderHlsPlan());
  });

  it('uses the direct WebRTC resource while direct streaming has not failed', async () => {
    const { result } = renderHook(() =>
      useCameraPlaybackPlan({
        entityId: 'home_assistant:camera.front',
        webRtcStreamSource: 'direct',
        directStreamUrl: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
        cameraState: 'streaming',
        preferredMode: 'live',
        preferredTransport: 'web_rtc',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current?.selectedTransport).toBe('web_rtc');
    expect(result.current?.selectedStreamResource).toMatchObject({
      kind: 'webrtc_stream',
      url: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
      authStrategy: 'none',
      metadata: { source: 'direct_stream_url' },
    });
    expect(result.current?.fallbackTransports).toEqual(['hls']);
  });

  it('falls back to the provider playback plan after direct WebRTC fails', async () => {
    const { result } = renderHook(() =>
      useCameraPlaybackPlan({
        entityId: 'home_assistant:camera.front',
        webRtcStreamSource: 'direct',
        directStreamUrl: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
        cameraState: 'streaming',
        preferredMode: 'live',
        preferredTransport: 'web_rtc',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(['web_rtc']),
      })
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current?.selectedTransport).toBe('hls');
    expect(result.current?.selectedStreamResource).toMatchObject({
      kind: 'hls_stream',
      url: '/api/hls/camera.front/master.m3u8',
    });
  });
});
