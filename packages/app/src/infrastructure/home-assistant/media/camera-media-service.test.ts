import { describe, expect, it, vi } from 'vitest';
import { CameraMediaService } from './camera-media-service';

describe('CameraMediaService', () => {
  it('probes HLS when Home Assistant camera capabilities are sparse', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:hls',
      kind: request.kind === 'camera_stream' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService({ resolve: resolveMock } as never, getCameraStreamMock);

    const plan = await service.getPlaybackPlan({
      entityId: 'camera.front',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front',
      frontendStreamTypes: [],
      hasGo2RtcFeed: false,
      isUnavailable: false,
      isRunning: true,
      failedTransports: new Set(),
    });

    expect(getCameraStreamMock).toHaveBeenCalledWith('camera.front', 'hls');
    expect(plan.primary.kind).toBe('hls_stream');
  });

  it('falls through to MJPEG when HLS probing fails', async () => {
    const resolveMock = vi.fn(
      async (request: { rawPath?: string; kind: string; stream?: string }) => ({
        id: `camera.front:${request.stream ?? 'snapshot'}`,
        kind: request.kind === 'camera_stream' ? 'image' : 'unavailable',
        cacheKey: `camera.front:${request.stream ?? 'snapshot'}`,
        authStrategy: 'same_origin' as const,
        url: request.rawPath,
      })
    );
    const getCameraStreamMock = vi.fn(async () => {
      throw new Error('stream unsupported');
    });
    const service = new CameraMediaService({ resolve: resolveMock } as never, getCameraStreamMock);

    const plan = await service.getPlaybackPlan({
      entityId: 'camera.front',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front',
      frontendStreamTypes: [],
      hasGo2RtcFeed: false,
      isUnavailable: false,
      isRunning: true,
      failedTransports: new Set(),
    });

    expect(plan.primary.kind).toBe('mjpeg_stream');
    expect(plan.primary.url).toBe('/api/camera_proxy_stream/camera.front');
  });

  it('does not re-cache-bust snapshot URLs that are already versioned by the camera card', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:snapshot',
      kind: request.kind === 'camera_snapshot' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:snapshot',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraStreamMock = vi.fn();
    const service = new CameraMediaService(
      { resolve: resolveMock } as never,
      getCameraStreamMock as never
    );

    const plan = await service.getPlaybackPlan({
      entityId: 'camera.front',
      preferredMode: 'snapshot',
      preferredTransport: 'auto',
      snapshotUrl: '/__navet_ha_proxy__/api/camera_proxy/camera.front?_t=3',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front',
      frontendStreamTypes: ['hls', 'web_rtc'],
      hasGo2RtcFeed: false,
      isUnavailable: false,
      isRunning: true,
      failedTransports: new Set(),
    });

    expect(resolveMock).toHaveBeenCalledWith({
      kind: 'camera_snapshot',
      entityId: 'camera.front',
      rawPath: '/__navet_ha_proxy__/api/camera_proxy/camera.front?_t=3',
    });
    expect(plan.primary.url).toBe('/__navet_ha_proxy__/api/camera_proxy/camera.front?_t=3');
  });

  it('prefers Home Assistant advertised frontend streams ahead of go2rtc in auto mode', async () => {
    const resolveMock = vi.fn(async (request: { rawPath?: string; kind: string }) => ({
      id: 'camera.front:hls',
      kind: request.kind === 'camera_stream' ? 'image' : 'unavailable',
      cacheKey: 'camera.front:hls',
      authStrategy: 'same_origin' as const,
      url: request.rawPath,
    }));
    const getCameraStreamMock = vi.fn(async () => ({
      url: '/api/hls/camera.front/master.m3u8',
    }));
    const service = new CameraMediaService({ resolve: resolveMock } as never, getCameraStreamMock);

    const plan = await service.getPlaybackPlan({
      entityId: 'camera.front',
      preferredMode: 'live',
      preferredTransport: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front',
      frontendStreamTypes: ['hls', 'web_rtc'],
      hasGo2RtcFeed: true,
      isUnavailable: false,
      isRunning: true,
      failedTransports: new Set(['web_rtc']),
    });

    expect(getCameraStreamMock).toHaveBeenCalledWith('camera.front', 'hls');
    expect(plan.primary.kind).toBe('hls_stream');
  });
});
