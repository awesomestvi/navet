import { cameraEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/camera';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraStreamPlayer } from '../camera-stream-player';

const {
  getCameraStreamUrlMock,
  getWebRtcClientConfigurationMock,
  subscribeCameraWebRtcOfferMock,
  addCameraWebRtcCandidateMock,
  resolveCameraStreamResourceMock,
  hlsAttachMediaMock,
  hlsInstances,
} = vi.hoisted(() => {
  const instances: Array<{ loadSource: ReturnType<typeof vi.fn> }> = [];
  return {
    getCameraStreamUrlMock: vi.fn(),
    getWebRtcClientConfigurationMock: vi.fn(),
    subscribeCameraWebRtcOfferMock: vi.fn(),
    addCameraWebRtcCandidateMock: vi.fn(),
    resolveCameraStreamResourceMock: vi.fn(),
    hlsAttachMediaMock: vi.fn(),
    hlsInstances: instances,
  };
});

vi.mock('@navet/app/services/integration-camera-feature.service', () => ({
  integrationCameraFeatureService: {
    closeCameraWebRtcSession: vi.fn(),
    getCameraStreamUrl: getCameraStreamUrlMock,
    getWebRtcClientConfiguration: getWebRtcClientConfigurationMock,
    subscribeCameraWebRtcOffer: subscribeCameraWebRtcOfferMock,
    addCameraWebRtcCandidate: addCameraWebRtcCandidateMock,
  },
}));

vi.mock('@navet/app/services/integration-camera-runtime.service', () => ({
  resolveCameraStreamResource: resolveCameraStreamResourceMock,
}));

vi.mock('hls.js', () => {
  class MockHls {
    static isSupported = vi.fn(() => true);
    static Events = {
      MEDIA_ATTACHED: 'media_attached',
      MANIFEST_PARSED: 'manifest_parsed',
      ERROR: 'error',
    };

    loadSource = vi.fn();
    private attached = false;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor() {
      hlsInstances.push({ loadSource: this.loadSource });
    }

    attachMedia = hlsAttachMediaMock.mockImplementation(() => {
      this.attached = true;
    });

    on(event: string, handler: (...args: unknown[]) => void) {
      const listeners = this.listeners.get(event) ?? [];
      listeners.push(handler);
      this.listeners.set(event, listeners);
      if (event === MockHls.Events.MEDIA_ATTACHED && this.attached) {
        handler();
      }
      if (event === MockHls.Events.MANIFEST_PARSED) {
        handler();
      }
    }

    destroy = vi.fn();
  }

  return { default: MockHls };
});

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

  constructor() {
    MockRTCPeerConnection.instances.push(this);
  }

  createDataChannel = vi.fn();
  addTransceiver = vi.fn();
  restartIce = vi.fn();
  close = vi.fn();
  createOffer = vi.fn(async () => ({ type: 'offer' as const, sdp: 'offer-sdp' }));
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => undefined);
  addIceCandidate = vi.fn(async () => undefined);
}

describe('CameraStreamPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hlsInstances.length = 0;
    MockRTCPeerConnection.instances = [];
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/camera.front/master.m3u8' });
    resolveCameraStreamResourceMock.mockResolvedValue({
      url: '/api/hls/camera.front/master.m3u8',
    });
    getWebRtcClientConfigurationMock.mockResolvedValue({ configuration: {} });
    subscribeCameraWebRtcOfferMock.mockResolvedValue(vi.fn());
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
      value: vi.fn(() => ''),
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
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    expect(container.querySelector('video')).toBeTruthy();
    await waitFor(() =>
      expect(getCameraStreamUrlMock).toHaveBeenCalledWith(
        cameraEntityFixtures.normal.entity_id,
        'hls'
      )
    );
    expect(resolveCameraStreamResourceMock).toHaveBeenCalledWith(
      cameraEntityFixtures.normal.entity_id,
      'hls',
      '/api/hls/camera.front/master.m3u8'
    );
  });

  it('shows a loading indicator until the first stream frame loads', async () => {
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onError={vi.fn()}
      />
    );

    expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();

    await waitFor(() =>
      expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalledWith(
        cameraEntityFixtures.normal.entity_id,
        'offer-sdp',
        expect.any(Function)
      )
    );

    const video = container.querySelector('video');
    expect(video).toBeTruthy();

    act(() => {
      video?.dispatchEvent(new Event('loadeddata'));
    });

    expect(screen.queryByRole('status', { name: 'Loading camera feed' })).not.toBeInTheDocument();
  });

  it('periodically reconnects mjpeg streams to recover from frozen multipart responses', async () => {
    vi.useFakeTimers();

    try {
      const { container } = render(
        <CameraStreamPlayer
          entityId={cameraEntityFixtures.normal.entity_id}
          kind={'mjpeg' as const}
          posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
          streamResource={{
            id: 'camera.front:mjpeg',
            kind: 'mjpeg_stream',
            cacheKey: 'camera.front:mjpeg',
            authStrategy: 'same_origin',
            url: '/api/camera_proxy_stream/camera.front',
          }}
          fitMode="contain"
          onError={vi.fn()}
        />
      );

      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        '/api/camera_proxy_stream/camera.front'
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        '/api/camera_proxy_stream/camera.front?_mjpeg_t=1'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('reuses the adapter-resolved HLS resource when the playback plan already resolved it', async () => {
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        streamResource={{
          id: 'camera.front:hls',
          kind: 'hls_stream',
          cacheKey: 'camera.front:hls',
          authStrategy: 'same_origin',
          url: '/api/hls/camera.front/master.m3u8?signed=1',
        }}
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    expect(container.querySelector('video')).toBeTruthy();
    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalled());
    expect(getCameraStreamUrlMock).not.toHaveBeenCalled();
    expect(resolveCameraStreamResourceMock).not.toHaveBeenCalled();
  });

  it('keeps the active HLS player mounted when only poster and resource object identity change', async () => {
    const onError = vi.fn();

    const { rerender } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl="/api/camera_proxy/camera.front?_t=0"
        streamResource={{
          id: 'camera.front:hls',
          kind: 'hls_stream',
          cacheKey: 'camera.front:hls',
          authStrategy: 'same_origin',
          url: '/api/hls/camera.front/master.m3u8?signed=1',
        }}
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalledTimes(1));

    rerender(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl="/api/camera_proxy/camera.front?_t=1"
        streamResource={{
          id: 'camera.front:hls',
          kind: 'hls_stream',
          cacheKey: 'camera.front:hls',
          authStrategy: 'same_origin',
          url: '/api/hls/camera.front/master.m3u8?signed=1',
        }}
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalledTimes(1));
    expect(hlsInstances).toHaveLength(1);
    expect(getCameraStreamUrlMock).not.toHaveBeenCalled();
    expect(resolveCameraStreamResourceMock).not.toHaveBeenCalled();
  });

  it('marks unsupported Home Assistant HLS streams as non-retryable', async () => {
    const onError = vi.fn();
    getCameraStreamUrlMock.mockRejectedValueOnce({
      code: 'start_stream_failed',
      message: 'camera.demo_camera does not support play stream service',
    });

    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(onError).toHaveBeenCalledWith('hls', { retryable: false }));
  });

  it('starts a WebRTC offer subscription and closes it on unmount', async () => {
    const unsubscribe = vi.fn();
    subscribeCameraWebRtcOfferMock.mockResolvedValue(unsubscribe);
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play');

    const { unmount } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onError={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalledWith(
        cameraEntityFixtures.normal.entity_id,
        'offer-sdp',
        expect.any(Function)
      )
    );

    MockRTCPeerConnection.instances[0]?.ontrack?.({
      track: { kind: 'video' } as MediaStreamTrack,
    });

    await waitFor(() => expect(playSpy).toHaveBeenCalled());

    unmount();

    await waitFor(() => expect(unsubscribe).toHaveBeenCalled());
    expect(MockRTCPeerConnection.instances[0]?.close).toHaveBeenCalled();
  });

  it('does not mark an active WebRTC media stream as stalled just because currentTime does not advance', async () => {
    const onError = vi.fn();

    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onError={onError}
      />
    );

    await waitFor(() =>
      expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalledWith(
        cameraEntityFixtures.normal.entity_id,
        'offer-sdp',
        expect.any(Function)
      )
    );

    vi.useFakeTimers();

    MockRTCPeerConnection.instances[0]?.ontrack?.({
      track: { kind: 'video' } as MediaStreamTrack,
    });

    const video = container.querySelector('video');
    expect(video).toBeTruthy();

    act(() => {
      video?.dispatchEvent(new Event('loadeddata'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(onError).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
