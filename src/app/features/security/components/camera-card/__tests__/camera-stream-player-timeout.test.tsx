import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { CameraStreamPlayer } from '../camera-stream-player';

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: {
    getCameraStreamUrl: vi.fn(),
    getWebRtcClientConfiguration: vi.fn(),
    subscribeCameraWebRtcOffer: vi.fn(),
    addCameraWebRtcCandidate: vi.fn(),
    getPanelHass: vi.fn(),
  },
}));

const serviceMock = vi.mocked(homeAssistantService);

describe('CameraStreamPlayer timeout fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    serviceMock.getCameraStreamUrl.mockResolvedValue({ url: '/api/hls/camera.front/master.m3u8' });
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
      value: vi.fn(() => 'probably'),
    });
  });

  it('marks HLS streams as failed when no frame loads before timeout', async () => {
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

    expect(serviceMock.getCameraStreamUrl).toHaveBeenCalledWith('camera.front', 'hls');

    await vi.advanceTimersByTimeAsync(10_000);

    expect(onError).toHaveBeenCalledWith('hls');
  });
});
