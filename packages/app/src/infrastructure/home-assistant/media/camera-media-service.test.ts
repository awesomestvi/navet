import type {
  PlatformCameraCapabilities,
  PlatformCameraStreamType,
} from '@navet/app/platform/provider-feature-models';
import { describe, expect, it, vi } from 'vitest';
import { CameraMediaService } from './camera-media-service';

function createCameraCapabilities(
  streamTypes: PlatformCameraStreamType[]
): PlatformCameraCapabilities {
  return { streamTypes };
}

describe('CameraMediaService', () => {
  it('returns snapshot playback for snapshot mode when a still is available', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () =>
      createCameraCapabilities(['web_rtc', 'hls'])
    );
    const getCameraStreamMock = vi.fn();
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock as never,
      getCameraStreamMock as never,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'idle',
      preferredMode: 'snapshot',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.snapshotResource?.url).toBe('/api/camera_proxy/camera.front');
    expect(model.selectedTransport).toBeNull();
    expect(model.supportsSnapshot).toBe(true);
    expect(model.refreshPolicy.snapshotRefreshMs).toBe(10_000);
    expect(getCameraStreamMock).not.toHaveBeenCalled();
  });

  it('prefers WebRTC before HLS when both transports are available', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () =>
      createCameraCapabilities(['web_rtc', 'hls'])
    );
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['web_rtc', 'hls']);
    expect(model.fallbackTransports).toEqual(['hls']);
    expect(model.selectedTransport).toBe('web_rtc');
    expect(getCameraStreamMock).toHaveBeenCalledWith('camera.front', 'hls');
  });

  it('starts live playback from the user-selected HLS transport and keeps later fallbacks', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () =>
      createCameraCapabilities(['web_rtc', 'hls', 'mjpeg'])
    );
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({
        mjpeg: '/api/camera_proxy_stream/camera.front',
      }))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'hls',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['hls', 'mjpeg']);
    expect(model.fallbackTransports).toEqual(['mjpeg']);
    expect(model.selectedTransport).toBe('hls');
    expect(getCameraStreamMock).toHaveBeenCalledTimes(1);
  });

  it('prefers a configured direct WebRTC player before HLS when Home Assistant exposes only HLS', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities(['hls']));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      webRtcStreamSource: 'direct',
      directStreamUrl: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'web_rtc',
      snapshotUrl: 'http://192.168.68.71:8123/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['web_rtc', 'hls']);
    expect(model.fallbackTransports).toEqual(['hls']);
    expect(model.selectedTransport).toBe('web_rtc');
    expect(model.selectedStreamResource).toMatchObject({
      kind: 'webrtc_stream',
      url: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
      metadata: { source: 'direct_stream_url' },
    });
  });

  it('does not use a configured direct WebRTC player while auto is selected', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      vi.fn(async () => createCameraCapabilities(['hls'])),
      vi.fn(async () => ({ url: '/api/hls/camera.front/master.m3u8' })),
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      directStreamUrl: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: 'http://192.168.68.71:8123/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['hls']);
    expect(model.selectedTransport).toBe('hls');
  });

  it('does not fall through to provider WebRTC when direct WebRTC is selected without a URL', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      vi.fn(async () => createCameraCapabilities(['web_rtc', 'hls'])),
      vi.fn(async () => ({ url: '/api/hls/camera.front/master.m3u8' })),
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      webRtcStreamSource: 'direct',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'web_rtc',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual([]);
    expect(model.selectedTransport).toBeNull();
    expect(model.isSnapshotFallback).toBe(true);
  });

  it('does not synthesize WebRTC player URLs when only a camera name is available', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      vi.fn(async () => createCameraCapabilities(['hls'])),
      vi.fn(async () => ({ url: '/api/hls/camera.front/master.m3u8' })),
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/__navet_ha_proxy__/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['hls']);
    expect(model.selectedTransport).toBe('hls');
  });

  it('falls back to snapshot when the user-selected start transport is missing from capabilities', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () =>
      createCameraCapabilities(['web_rtc', 'hls'])
    );
    const getCameraStreamMock = vi.fn();
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock as never,
      getCameraStreamMock as never,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'mjpeg',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual([]);
    expect(model.selectedTransport).toBeNull();
    expect(model.isSnapshotFallback).toBe(true);
    expect(model.shouldStartWithSnapshot).toBe(true);
  });

  it('starts live playback from the user-selected WebRTC transport and keeps later fallbacks', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () =>
      createCameraCapabilities(['web_rtc', 'hls', 'mjpeg'])
    );
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const getCameraStreamPathsMock = vi.fn(async () => ({
      mjpeg: '/api/camera_proxy_stream/camera.front',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      getCameraStreamPathsMock
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'web_rtc',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['web_rtc', 'hls', 'mjpeg']);
    expect(model.fallbackTransports).toEqual(['hls', 'mjpeg']);
    expect(model.selectedTransport).toBe('web_rtc');
  });

  it('normalizes provider-scoped camera ids before requesting Home Assistant capabilities and HLS streams', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'home_assistant:camera.front:hls',
      kind: 'image',
      cacheKey: 'home_assistant:camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities(['hls']));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'home_assistant:camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(getCameraCapabilitiesMock).toHaveBeenCalledWith('camera.front');
    expect(getCameraStreamMock).toHaveBeenCalledWith('camera.front', 'hls');
    expect(model.selectedTransport).toBe('hls');
  });

  it('falls back to WebRTC then HLS when capabilities are sparse but the camera is normalized as stream-capable', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities([]));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['web_rtc', 'hls']);
    expect(model.fallbackTransports).toEqual(['hls']);
    expect(model.selectedTransport).toBe('web_rtc');
    expect(model.selectedStreamResource).toBeNull();
  });

  it('does not block live startup on a stalled capabilities request', async () => {
    vi.useFakeTimers();
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(() => new Promise<never>(() => undefined));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const planPromise = service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    await vi.advanceTimersByTimeAsync(750);

    await expect(planPromise).resolves.toMatchObject({
      liveTransports: ['web_rtc', 'hls'],
      selectedTransport: 'web_rtc',
    });

    vi.useRealTimers();
  });

  it('reuses cached capabilities when a later capabilities lookup stalls', async () => {
    vi.useFakeTimers();
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi
      .fn<() => Promise<PlatformCameraCapabilities>>()
      .mockResolvedValueOnce(createCameraCapabilities(['web_rtc', 'hls']))
      .mockImplementationOnce(() => new Promise<never>(() => undefined));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const initialPlan = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(initialPlan.liveTransports).toEqual(['web_rtc', 'hls']);

    const stalledPlanPromise = service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    await vi.advanceTimersByTimeAsync(750);

    await expect(stalledPlanPromise).resolves.toMatchObject({
      liveTransports: ['web_rtc', 'hls'],
      selectedTransport: 'web_rtc',
    });

    vi.useRealTimers();
  });

  it('keeps sparse capabilities in snapshot mode when the camera is not normalized as stream-capable', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities([]));
    const getCameraStreamMock = vi.fn();
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock as never,
      getCameraStreamMock as never,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'idle',
      preferredMode: 'auto',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: false,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual([]);
    expect(model.selectedTransport).toBeNull();
    expect(model.shouldStartWithSnapshot).toBe(true);
    expect(getCameraStreamMock).not.toHaveBeenCalled();
  });

  it('falls back to snapshots when live playback cannot be selected', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities(['hls']));
    const getCameraStreamMock = vi.fn(async () => {
      throw new Error('stream unsupported');
    });
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(['hls']),
    });

    expect(model.selectedTransport).toBeNull();
    expect(model.isSnapshotFallback).toBe(true);
    expect(model.shouldStartWithSnapshot).toBe(true);
    expect(model.refreshPolicy.snapshotRefreshMs).toBe(30_000);
  });

  it('falls back from advertised hls to mjpeg when Home Assistant rejects camera/stream', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:mjpeg',
      kind: 'image',
      cacheKey: 'camera.front:mjpeg',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities(['hls']));
    const getCameraStreamMock = vi.fn(async () => {
      throw Object.assign(new Error('stream unsupported'), {
        code: 'start_stream_failed',
      });
    });
    const getCameraStreamPathsMock = vi.fn(async () => ({
      mjpeg: '/api/camera_proxy_stream/camera.front',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock as never,
      getCameraStreamPathsMock
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['mjpeg']);
    expect(model.selectedTransport).toBe('mjpeg');
    expect(model.selectedStreamResource).toMatchObject({
      kind: 'mjpeg_stream',
      url: '/api/camera_proxy_stream/camera.front',
    });
  });

  it('keeps HLS selected when Home Assistant rejects camera/stream but still exposes an HLS path', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:hls',
      kind: 'image',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities(['hls']));
    const getCameraStreamMock = vi.fn(async () => {
      throw Object.assign(new Error('stream unsupported'), {
        code: 'start_stream_failed',
      });
    });
    const getCameraStreamPathsMock = vi.fn(async () => ({
      hls: '/api/hls/camera.front/master.m3u8',
      mjpeg: '/api/camera_proxy_stream/camera.front',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock as never,
      getCameraStreamPathsMock
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['hls', 'mjpeg']);
    expect(model.fallbackTransports).toEqual(['mjpeg']);
    expect(model.selectedTransport).toBe('hls');
    expect(model.selectedStreamResource).toMatchObject({
      kind: 'hls_stream',
      url: '/api/hls/camera.front/master.m3u8',
    });
    expect(getCameraStreamPathsMock).toHaveBeenCalledWith('camera.front');
  });

  it('returns no live transport when the camera is unavailable', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () =>
      createCameraCapabilities(['web_rtc', 'hls'])
    );
    const getCameraStreamMock = vi.fn();
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock as never,
      getCameraStreamMock as never,
      vi.fn(async () => ({}))
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'unavailable',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.cameraState).toBe('unavailable');
    expect(model.liveTransports).toEqual([]);
    expect(model.selectedTransport).toBeNull();
    expect(getCameraStreamMock).not.toHaveBeenCalled();
  });

  it('uses Home Assistant mjpeg stream paths as a live fallback when hls and webrtc are unavailable', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string }) => ({
      id: 'camera.front:mjpeg',
      kind: 'image',
      cacheKey: 'camera.front:mjpeg',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraCapabilitiesMock = vi.fn(async () => createCameraCapabilities(['mjpeg']));
    const getCameraStreamMock = vi.fn();
    const getCameraStreamPathsMock = vi.fn(async () => ({
      mjpeg: '/api/camera_proxy_stream/camera.front',
    }));
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraCapabilitiesMock,
      getCameraStreamMock as never,
      getCameraStreamPathsMock
    );

    const model = await service.getPlaybackPlan({
      entityId: 'camera.front',
      cameraState: 'streaming',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      isStreamCapable: true,
      motionDetectionEnabled: true,
      failedTransports: new Set(),
    });

    expect(model.liveTransports).toEqual(['mjpeg']);
    expect(model.selectedTransport).toBe('mjpeg');
    expect(model.selectedStreamResource).toMatchObject({
      kind: 'mjpeg_stream',
      url: '/api/camera_proxy_stream/camera.front',
    });
    expect(getCameraStreamPathsMock).toHaveBeenCalledWith('camera.front');
  });
});
