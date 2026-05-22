import { describe, expect, it } from 'vitest';
import {
  appendCameraCacheBuster,
  CAMERA_AUTO_REFRESH_INTERVAL_MS,
  CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS,
  getCameraAutoRefreshInterval,
  resolveCameraMjpegStreamUrl,
  selectCameraImageSource,
} from '../camera-view-mode';

describe('camera view mode helpers', () => {
  it('uses the HA MJPEG proxy for live cameras when available', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['web_rtc'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(),
    });

    expect(source).toEqual({
      url: '/api/camera_proxy_stream/camera.front?_t=0',
      kind: 'mjpeg',
      isFallback: false,
    });
  });

  it('uses WebRTC for live cameras when the MJPEG proxy is unavailable', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: undefined,
      frontendStreamTypes: ['web_rtc'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(),
    });

    expect(source).toEqual({
      url: undefined,
      kind: 'web_rtc',
      isFallback: false,
    });
  });

  it('uses HLS for live cameras when MJPEG and WebRTC are unavailable', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: undefined,
      frontendStreamTypes: ['hls', 'web_rtc'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(['web_rtc']),
    });

    expect(source).toEqual({
      url: undefined,
      kind: 'hls',
      isFallback: false,
    });
  });

  it('falls live mode back to snapshots when streaming is unavailable', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: undefined,
      frontendStreamTypes: [],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(),
    });

    expect(source).toEqual({
      url: '/api/camera_proxy/camera.front?_t=0',
      kind: 'snapshot',
      isFallback: false,
    });
  });

  it('uses snapshots for auto mode and refreshes them', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'auto',
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['hls'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(),
    });

    expect(source.kind).toBe('snapshot');
    expect(source.url).toBe('/api/camera_proxy/camera.front?_t=0');
    expect(
      getCameraAutoRefreshInterval({
        cameraViewMode: 'auto',
        imageSourceKind: source.kind,
        isFallback: source.isFallback,
      })
    ).toBe(CAMERA_AUTO_REFRESH_INTERVAL_MS);
  });

  it('does not auto-refresh snapshot mode', () => {
    expect(
      getCameraAutoRefreshInterval({
        cameraViewMode: 'snapshot',
        imageSourceKind: 'snapshot',
        isFallback: false,
      })
    ).toBeNull();
  });

  it('falls back to snapshots after stream errors and uses live fallback refresh timing', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      snapshotUrl: '/api/camera_proxy/camera.front?_t=1',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=1',
      frontendStreamTypes: ['web_rtc'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(['mjpeg', 'web_rtc']),
    });

    expect(source).toEqual({
      url: '/api/camera_proxy/camera.front?_t=1',
      kind: 'snapshot',
      isFallback: true,
    });
    expect(
      getCameraAutoRefreshInterval({
        cameraViewMode: 'live',
        imageSourceKind: source.kind,
        isFallback: source.isFallback,
      })
    ).toBe(CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS);
  });

  it('builds cache-busted snapshot and stream proxy URLs', () => {
    expect(appendCameraCacheBuster('/api/camera_proxy/camera.front', 3)).toBe(
      '/api/camera_proxy/camera.front?_t=3'
    );
    expect(resolveCameraMjpegStreamUrl('/api/camera_proxy/camera.front')).toBe(
      '/api/camera_proxy_stream/camera.front'
    );
  });
});
