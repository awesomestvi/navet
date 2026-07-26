import type { PlatformCameraPlaybackModel } from '@navet/app/platform/provider-feature-models';
import { getCameraPlaybackPlan } from '@navet/app/services/integration-camera-runtime.service';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeCameraDirectStreamUrl, useCameraPlaybackPlan } from './use-camera-playback-plan';

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

  it('rejects mixed-content direct streams on an HTTPS dashboard', () => {
    expect(
      normalizeCameraDirectStreamUrl(
        'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
        'https:'
      )
    ).toBeNull();
    expect(
      normalizeCameraDirectStreamUrl(
        'https://go2rtc.example/stream.html?src=camera_bedroom',
        'https:'
      )
    ).toBe('https://go2rtc.example/stream.html?src=camera_bedroom');
  });

  it('keeps the provided direct stream URL unchanged', () => {
    const normalizedUrl = normalizeCameraDirectStreamUrl(
      'http://go2rtc.local:1984/stream.html?src=front&background=false',
      'http:'
    );

    expect(normalizedUrl).toBe('http://go2rtc.local:1984/stream.html?src=front&background=false');
  });

  it('rejects direct viewer URLs without exactly one go2rtc stream source', () => {
    expect(
      normalizeCameraDirectStreamUrl('http://go2rtc.local:1984/stream.html', 'http:')
    ).toBeNull();
    expect(
      normalizeCameraDirectStreamUrl(
        'http://go2rtc.local:1984/stream.html?src=front&src=back',
        'http:'
      )
    ).toBeNull();
  });

  it('refreshes the current mounted plan after a capability startup timeout', async () => {
    vi.useFakeTimers();
    getCameraPlaybackPlanMock
      .mockResolvedValueOnce({
        ...createProviderHlsPlan(),
        refreshPolicy: {
          capabilitiesRefreshMs: 1_000,
          retryDelaysMs: [1_000, 3_000, 7_000],
        },
      })
      .mockResolvedValueOnce({
        ...createProviderHlsPlan(),
        liveTransports: ['web_rtc', 'hls'],
        fallbackTransports: ['hls'],
        selectedTransport: 'web_rtc',
        selectedStreamResource: null,
      });

    const { result } = renderHook(() =>
      useCameraPlaybackPlan({
        entityId: 'home_assistant:camera.front',
        webRtcStreamSource: 'provider',
        cameraState: 'streaming',
        preferredMode: 'live',
        preferredTransport: 'auto',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current?.selectedTransport).toBe('hls');
    expect(getCameraPlaybackPlanMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(getCameraPlaybackPlanMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(getCameraPlaybackPlanMock).toHaveBeenCalledTimes(2);
    expect(result.current?.selectedTransport).toBe('web_rtc');

    vi.useRealTimers();
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
    expect(result.current?.fallbackTransports).toEqual([]);
  });

  it('does not fall back to the provider stream after the direct stream fails', async () => {
    getCameraPlaybackPlanMock.mockResolvedValueOnce({
      ...createProviderHlsPlan(),
      liveTransports: ['web_rtc', 'hls'],
      fallbackTransports: ['hls'],
      selectedTransport: 'web_rtc',
      selectedStreamResource: null,
    });
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
        directStreamFailed: true,
      })
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current?.selectedTransport).toBeNull();
    expect(result.current?.selectedStreamResource).toBeNull();
    expect(result.current?.fallbackTransports).toEqual([]);
    expect(result.current?.isSnapshotFallback).toBe(true);
    expect(getCameraPlaybackPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        webRtcStreamSource: 'provider',
        directStreamUrl: undefined,
        failedTransports: new Set(),
      })
    );
  });

  it('uses the direct URL unchanged independently of the provider transport preference', async () => {
    const { result } = renderHook(() =>
      useCameraPlaybackPlan({
        entityId: 'home_assistant:camera.front',
        webRtcStreamSource: 'direct',
        directStreamUrl: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
        cameraState: 'streaming',
        preferredMode: 'live',
        preferredTransport: 'hls',
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
      metadata: { source: 'direct_stream_url' },
    });
    expect(result.current?.fallbackTransports).toEqual([]);
    expect(getCameraPlaybackPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        webRtcStreamSource: 'provider',
        directStreamUrl: undefined,
        preferredTransport: 'hls',
      })
    );
  });

  it('does not use provider playback when direct source has no saved URL', async () => {
    const { result } = renderHook(() =>
      useCameraPlaybackPlan({
        entityId: 'home_assistant:camera.front',
        webRtcStreamSource: 'direct',
        directStreamUrl: '',
        cameraState: 'streaming',
        preferredMode: 'live',
        preferredTransport: 'auto',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current?.selectedTransport).toBeNull();
    expect(result.current?.selectedStreamResource).toBeNull();
    expect(result.current?.supportsStreaming).toBe(false);
    expect(result.current?.snapshotResource?.kind).toBe('image');
  });

  it('does not override an explicit snapshot view with a direct stream', async () => {
    const { result } = renderHook(() =>
      useCameraPlaybackPlan({
        entityId: 'home_assistant:camera.front',
        webRtcStreamSource: 'direct',
        directStreamUrl: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
        cameraState: 'streaming',
        preferredMode: 'snapshot',
        preferredTransport: 'auto',
        snapshotUrl: '/api/camera_proxy/camera.front',
        isStreamCapable: true,
        motionDetectionEnabled: true,
        failedTransports: new Set(),
      })
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current?.selectedTransport).toBeNull();
    expect(result.current?.selectedStreamResource).toBeNull();
    expect(result.current?.snapshotResource?.kind).toBe('image');
  });
});
