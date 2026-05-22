import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { CameraStreamPlayer } from '../camera-stream-player';

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: {
    getCameraStreamUrl: vi.fn(),
    getWebRtcClientConfiguration: vi.fn(),
    subscribeCameraWebRtcOffer: vi.fn(),
    addCameraWebRtcCandidate: vi.fn(),
  },
}));

const serviceMock = vi.mocked(homeAssistantService);

class MockMediaStream {
  getTracks() {
    return [];
  }

  addTrack() {}
}

class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = [];

  ontrack: ((event: { track: MediaStreamTrack }) => void) | null = null;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  iceConnectionState = 'new';
  closed = false;

  constructor() {
    MockRTCPeerConnection.instances.push(this);
  }

  createDataChannel = vi.fn();
  addTransceiver = vi.fn();
  restartIce = vi.fn();
  close = vi.fn(() => {
    this.closed = true;
  });
  createOffer = vi.fn(async () => ({ type: 'offer' as const, sdp: 'offer-sdp' }));
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => undefined);
  addIceCandidate = vi.fn(async () => undefined);
}

describe('CameraStreamPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockRTCPeerConnection.instances = [];
    serviceMock.getCameraStreamUrl.mockResolvedValue({ url: '/api/hls/camera.front/master.m3u8' });
    serviceMock.getWebRtcClientConfiguration.mockResolvedValue({ configuration: {} });
    serviceMock.subscribeCameraWebRtcOffer.mockResolvedValue(vi.fn());
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
    vi.stubGlobal('MediaStream', MockMediaStream);
    vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
    vi.stubGlobal(
      'RTCSessionDescription',
      vi.fn((value) => value)
    );
    vi.stubGlobal(
      'RTCIceCandidate',
      vi.fn((value) => value)
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests an HLS stream URL and renders a video element', async () => {
    const { container } = render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="hls"
        posterUrl="/api/camera_proxy/camera.front"
        homeAssistantUrl="https://ha.example.com"
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    expect(container.querySelector('video')).toBeTruthy();
    await waitFor(() =>
      expect(serviceMock.getCameraStreamUrl).toHaveBeenCalledWith('camera.front', 'hls')
    );
  });

  it('starts a WebRTC offer subscription and closes it on unmount', async () => {
    const unsubscribe = vi.fn();
    serviceMock.subscribeCameraWebRtcOffer.mockResolvedValue(unsubscribe);

    const { unmount } = render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="web_rtc"
        posterUrl="/api/camera_proxy/camera.front"
        homeAssistantUrl="https://ha.example.com"
        fitMode="contain"
        onError={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(serviceMock.subscribeCameraWebRtcOffer).toHaveBeenCalledWith(
        'camera.front',
        'offer-sdp',
        expect.any(Function)
      )
    );

    unmount();

    await waitFor(() => expect(unsubscribe).toHaveBeenCalled());
    expect(MockRTCPeerConnection.instances[0]?.close).toHaveBeenCalled();
  });
});
