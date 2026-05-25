import { describe, expect, it } from 'vitest';
import {
  appendCameraCacheBuster,
  CAMERA_AUTO_REFRESH_INTERVAL_MS,
  CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS,
  getCameraAutoRefreshInterval,
  resolveCameraMjpegStreamUrl,
  resolveDashboardCameraViewMode,
  resolveViewerInitialCameraViewMode,
  selectCameraImageSource,
} from '../camera-view-mode';

describe('camera view mode helpers', () => {
  it('prefers WebRTC before MJPEG in standalone live auto mode', () => {
    window.__NAVET_PANEL__ = false;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['hls', 'web_rtc'],
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

  it('prefers go2rtc for live cameras when the custom card is available', () => {
    window.__NAVET_PANEL__ = false;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: true,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['hls', 'web_rtc'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(),
    });

    expect(source).toEqual({
      url: undefined,
      kind: 'go2rtc',
      isFallback: false,
    });
  });

  it('prefers WebRTC for panel live cameras when Home Assistant advertises it', () => {
    window.__NAVET_PANEL__ = true;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['hls', 'web_rtc'],
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

  it('falls live mode back from WebRTC to HLS', () => {
    window.__NAVET_PANEL__ = true;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['web_rtc', 'hls'],
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

  it('falls live mode back from HLS to MJPEG', () => {
    window.__NAVET_PANEL__ = true;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['hls', 'web_rtc'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(['web_rtc', 'hls']),
    });

    expect(source).toEqual({
      url: '/api/camera_proxy_stream/camera.front?_t=0',
      kind: 'mjpeg',
      isFallback: false,
    });
  });

  it('falls live mode back to snapshots when streaming is unavailable', () => {
    window.__NAVET_PANEL__ = false;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: false,
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
      cameraFeedMode: 'web_rtc',
      hasGo2RtcFeed: false,
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
    window.__NAVET_PANEL__ = false;

    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'auto',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=1',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=1',
      frontendStreamTypes: ['web_rtc', 'hls'],
      isUnavailable: false,
      isRunning: true,
      failedStreamTypes: new Set(['web_rtc', 'hls', 'mjpeg']),
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

  it('honors a selected MJPEG feed ahead of WebRTC when it is available', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'mjpeg',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: '/api/camera_proxy_stream/camera.front?_t=0',
      frontendStreamTypes: ['web_rtc', 'hls'],
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

  it('falls a selected feed back to the live order when it is unavailable', () => {
    const source = selectCameraImageSource({
      cameraViewMode: 'live',
      cameraFeedMode: 'mjpeg',
      hasGo2RtcFeed: false,
      snapshotUrl: '/api/camera_proxy/camera.front?_t=0',
      mjpegStreamUrl: undefined,
      frontendStreamTypes: ['web_rtc', 'hls'],
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

  it('builds cache-busted snapshot and stream proxy URLs', () => {
    expect(appendCameraCacheBuster('/api/camera_proxy/camera.front', 3)).toBe(
      '/api/camera_proxy/camera.front?_t=3'
    );
    expect(resolveCameraMjpegStreamUrl('/api/camera_proxy/camera.front')).toBe(
      '/api/camera_proxy_stream/camera.front'
    );
  });

  it('defaults dashboard cards to snapshot previews in low power mode when snapshots exist', () => {
    expect(
      resolveDashboardCameraViewMode({
        cameraDashboardViewMode: 'live',
        hasCameraViewModeOverride: false,
        lowPowerMode: true,
        hasSnapshot: true,
        preferSnapshotPreview: false,
      })
    ).toBe('snapshot');
  });

  it('defaults standalone dashboard previews to snapshots when the camera has no explicit override', () => {
    expect(
      resolveDashboardCameraViewMode({
        cameraDashboardViewMode: 'live',
        hasCameraViewModeOverride: false,
        lowPowerMode: false,
        hasSnapshot: true,
        preferSnapshotPreview: true,
      })
    ).toBe('snapshot');
  });

  it('keeps an explicit dashboard preview override in standalone mode', () => {
    expect(
      resolveDashboardCameraViewMode({
        cameraDashboardViewMode: 'live',
        hasCameraViewModeOverride: true,
        lowPowerMode: false,
        hasSnapshot: true,
        preferSnapshotPreview: true,
      })
    ).toBe('live');
  });

  it('keeps the saved dashboard preview mode when low power mode has no snapshot to fall back to', () => {
    expect(
      resolveDashboardCameraViewMode({
        cameraDashboardViewMode: 'live',
        hasCameraViewModeOverride: false,
        lowPowerMode: true,
        hasSnapshot: false,
        preferSnapshotPreview: true,
      })
    ).toBe('live');
  });

  it('opens the viewer live when streaming is available even if the dashboard preview is snapshot', () => {
    expect(
      resolveViewerInitialCameraViewMode({
        isStreamCapable: true,
        hasSnapshot: true,
      })
    ).toBe('live');
  });

  it('keeps snapshot-only cameras on snapshots in the viewer', () => {
    expect(
      resolveViewerInitialCameraViewMode({
        isStreamCapable: false,
        hasSnapshot: true,
      })
    ).toBe('snapshot');
  });
});
