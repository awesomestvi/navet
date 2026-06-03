import { describe, expect, it } from 'vitest';
import {
  appendCameraCacheBuster,
  getCameraAutoRefreshInterval,
  normalizeCameraSnapshotUrl,
  readCameraStreamTypes,
  resolveDashboardCameraViewMode,
  resolveViewerInitialCameraViewMode,
} from '../camera-view-mode';

describe('camera-view-mode', () => {
  it('forces snapshot mode in low-power mode when a snapshot exists', () => {
    expect(
      resolveDashboardCameraViewMode({
        cameraDashboardViewMode: 'live',
        lowPowerMode: true,
        hasSnapshot: true,
      })
    ).toBe('snapshot');
  });

  it('opens the viewer in live mode when the camera supports streaming', () => {
    expect(
      resolveViewerInitialCameraViewMode({
        isStreamCapable: true,
        hasSnapshot: true,
      })
    ).toBe('live');
  });

  it('normalizes snapshot URLs without preserving HA proxy query strings', () => {
    expect(normalizeCameraSnapshotUrl('/api/camera_proxy/camera.front?_t=3')).toBe(
      '/api/camera_proxy/camera.front'
    );
  });

  it('appends cache-busting query params to snapshots', () => {
    expect(appendCameraCacheBuster('/api/camera_proxy/camera.front', 4)).toBe(
      '/api/camera_proxy/camera.front?_t=4'
    );
  });

  it('reads only documented HA-native stream types', () => {
    expect(readCameraStreamTypes(['hls', 'web_rtc', 'mjpeg'])).toEqual(['hls', 'web_rtc']);
  });

  it('refreshes live snapshot fallbacks more slowly than explicit snapshot mode', () => {
    expect(
      getCameraAutoRefreshInterval({
        cameraViewMode: 'live',
        imageSourceKind: 'snapshot',
        isFallback: true,
      })
    ).toBe(30_000);
    expect(
      getCameraAutoRefreshInterval({
        cameraViewMode: 'snapshot',
        imageSourceKind: 'snapshot',
        isFallback: false,
      })
    ).toBeNull();
  });
});
