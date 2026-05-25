import { render, waitFor } from '@testing-library/react';
import type { HassConfig } from 'home-assistant-js-websocket';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { CameraStreamPlayer, resolveGo2RtcWebSocketUrl } from '../camera-stream-player';

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

const panelConfig = {
  latitude: 0,
  longitude: 0,
  elevation: 0,
  radius: 100,
  unit_system: {
    length: 'km',
    mass: 'g',
    volume: 'L',
    temperature: 'C',
    pressure: 'Pa',
    wind_speed: 'm/s',
    accumulated_precipitation: 'mm',
  },
  location_name: 'Home',
  time_zone: 'Europe/Stockholm',
  components: [],
  config_dir: '/config',
  allowlist_external_dirs: [],
  allowlist_external_urls: [],
  version: '2026.5.0',
  config_source: 'storage',
  recovery_mode: false,
  safe_mode: false,
  state: 'RUNNING',
  external_url: null,
  internal_url: null,
  currency: 'SEK',
  country: 'SE',
  language: 'en',
} satisfies HassConfig;

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

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = MockWebSocket.OPEN;
  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }
}

describe('CameraStreamPlayer', () => {
  let go2RtcConfig: Record<string, unknown> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    document.querySelector('base')?.remove();
    window.history.replaceState(null, '', '/');
    go2RtcConfig = null;
    MockRTCPeerConnection.instances = [];
    MockWebSocket.instances = [];
    serviceMock.getPanelHass.mockReturnValue({
      states: {},
      config: panelConfig,
      callService: vi.fn(),
      callWS: vi.fn(),
    });
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
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal(
      'RTCSessionDescription',
      vi.fn((value) => value)
    );
    vi.stubGlobal(
      'RTCIceCandidate',
      vi.fn((value) => value)
    );
    if (!customElements.get('webrtc-camera')) {
      customElements.define(
        'webrtc-camera',
        class extends HTMLElement {
          setConfig(config: Record<string, unknown>) {
            go2RtcConfig = config;
          }
        }
      );
    }
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

  it('loads HLS streams through the ingress-aware Home Assistant proxy', async () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
    document.head.append(base);
    const canPlayType = vi
      .spyOn(HTMLVideoElement.prototype, 'canPlayType')
      .mockReturnValue('probably');

    const { container } = render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="hls"
        posterUrl="/api/camera_proxy/camera.front"
        homeAssistantUrl="http://homeassistant.local:8123"
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(container.querySelector('video')?.src).toBe(
        `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/hls/camera.front/master.m3u8`
      )
    );
    expect(canPlayType).toHaveBeenCalledWith('application/vnd.apple.mpegurl');
  });

  it('marks unsupported Home Assistant HLS streams as non-retryable', async () => {
    const onError = vi.fn();
    serviceMock.getCameraStreamUrl.mockRejectedValueOnce({
      code: 'start_stream_failed',
      message: 'camera.demo_camera does not support play stream service',
    });

    render(
      <CameraStreamPlayer
        entityId="camera.demo_camera"
        kind="hls"
        posterUrl="/api/camera_proxy/camera.demo_camera"
        homeAssistantUrl="https://ha.example.com"
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(onError).toHaveBeenCalledWith('hls', { retryable: false }));
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

  it('embeds the go2rtc WebRTC custom card when available', async () => {
    const { container } = render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="go2rtc"
        posterUrl="/api/camera_proxy/camera.front"
        homeAssistantUrl="https://ha.example.com"
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(go2RtcConfig).toEqual(
        expect.objectContaining({
          type: 'custom:webrtc-camera',
          entity: 'camera.front',
          mode: 'webrtc',
        })
      )
    );
    expect(container.querySelector('webrtc-camera')).toBeTruthy();
  });

  it('connects directly to a configured go2rtc WebSocket feed before using the custom card', async () => {
    render(
      <CameraStreamPlayer
        entityId="camera.front"
        kind="go2rtc"
        posterUrl="/api/camera_proxy/camera.front"
        homeAssistantUrl="https://ha.example.com"
        go2RtcConfig={{ serverUrl: 'http://go2rtc.local:1984', streamName: 'front_door' }}
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(MockWebSocket.instances[0]?.url).toBe('ws://go2rtc.local:1984/api/ws?src=front_door')
    );

    MockWebSocket.instances[0]?.onopen?.();

    await waitFor(() =>
      expect(MockWebSocket.instances[0]?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'webrtc/offer', value: 'offer-sdp' })
      )
    );
    expect(go2RtcConfig).toBeNull();
  });

  it('normalizes go2rtc server inputs into websocket endpoints', () => {
    expect(
      resolveGo2RtcWebSocketUrl({ serverUrl: 'go2rtc.local:1984', streamName: 'front_door' })
    ).toBe('ws://go2rtc.local:1984/api/ws?src=front_door');
    expect(
      resolveGo2RtcWebSocketUrl({
        serverUrl: 'https://go2rtc.local',
        streamName: 'camera.front_door',
      })
    ).toBe('wss://go2rtc.local/api/ws?src=camera.front_door');
  });
});
