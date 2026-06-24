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
  const instances: Array<{
    loadSource: ReturnType<typeof vi.fn>;
    startLoad: ReturnType<typeof vi.fn>;
    recoverMediaError: ReturnType<typeof vi.fn>;
    emit: (event: string, ...args: unknown[]) => void;
  }> = [];
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
    closeCameraWebRtcSession: vi.fn(async () => undefined),
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
      LEVEL_LOADED: 'level_loaded',
      FRAG_LOADED: 'frag_loaded',
      ERROR: 'error',
    };
    static ErrorTypes = {
      MEDIA_ERROR: 'mediaError',
      NETWORK_ERROR: 'networkError',
    };

    loadSource = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();
    private attached = false;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor() {
      hlsInstances.push({
        loadSource: this.loadSource,
        startLoad: this.startLoad,
        recoverMediaError: this.recoverMediaError,
        emit: (event: string, ...args: unknown[]) => {
          for (const handler of this.listeners.get(event) ?? []) {
            handler(...args);
          }
        },
      });
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

class MockRTCSessionDescription {
  type: RTCSdpType;
  sdp?: string;

  constructor(value: RTCSessionDescriptionInit) {
    this.type = value.type;
    this.sdp = value.sdp;
  }
}

class MockRTCIceCandidate {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;

  constructor(value: RTCIceCandidateInit) {
    this.candidate = value.candidate;
    this.sdpMid = value.sdpMid;
    this.sdpMLineIndex = value.sdpMLineIndex;
  }
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
    vi.stubGlobal('RTCSessionDescription', MockRTCSessionDescription);
    vi.stubGlobal('RTCIceCandidate', MockRTCIceCandidate);
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

  it('clears the HLS loading indicator when playback starts without a loadeddata event', async () => {
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="cover"
        onError={vi.fn()}
      />
    );

    expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();

    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalled());

    const video = container.querySelector('video');
    expect(video).toBeTruthy();

    act(() => {
      video?.dispatchEvent(new Event('playing'));
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
      expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();

      act(() => {
        container.querySelector('img')?.dispatchEvent(new Event('load'));
      });

      expect(screen.queryByRole('status', { name: 'Loading camera feed' })).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        '/api/camera_proxy_stream/camera.front?_mjpeg_t=1'
      );
      expect(screen.queryByRole('status', { name: 'Loading camera feed' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not mutate signed mjpeg stream urls when forcing a reconnect', async () => {
    vi.useFakeTimers();

    try {
      const signedStreamUrl =
        '/__navet_ha_proxy__/api/camera_proxy_stream/camera.front?authSig=signed-token';
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
            url: signedStreamUrl,
          }}
          fitMode="contain"
          onError={vi.fn()}
        />
      );

      expect(container.querySelector('img')?.getAttribute('src')).toBe(signedStreamUrl);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(container.querySelector('img')?.getAttribute('src')).toBe(signedStreamUrl);
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

  it('recovers one fatal HLS media error before falling back', async () => {
    const onError = vi.fn();

    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalled());

    act(() => {
      hlsInstances[0]?.emit('error', undefined, {
        fatal: true,
        type: 'mediaError',
      });
    });

    expect(hlsInstances[0]?.recoverMediaError).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    act(() => {
      hlsInstances[0]?.emit('error', undefined, {
        fatal: true,
        type: 'mediaError',
      });
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('hls'));
  });

  it('retries one fatal HLS network error before falling back', async () => {
    const onError = vi.fn();

    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="hls"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalled());

    act(() => {
      hlsInstances[0]?.emit('error', undefined, {
        fatal: true,
        type: 'networkError',
      });
    });

    expect(hlsInstances[0]?.startLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    act(() => {
      hlsInstances[0]?.emit('error', undefined, {
        fatal: true,
        type: 'networkError',
      });
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('hls'));
  });

  it('refreshes a reused HLS resource with a fresh stream URL before falling back', async () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();
      getCameraStreamUrlMock.mockResolvedValueOnce({
        url: '/api/hls/camera.front/master.m3u8?fresh=1',
      });
      resolveCameraStreamResourceMock.mockResolvedValueOnce({
        url: '/api/hls/camera.front/master.m3u8?fresh=1',
      });

      render(
        <CameraStreamPlayer
          entityId={cameraEntityFixtures.normal.entity_id}
          kind="hls"
          posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
          streamResource={{
            id: 'camera.front:hls',
            kind: 'hls_stream',
            cacheKey: 'camera.front:hls',
            authStrategy: 'same_origin',
            url: '/api/hls/camera.front/master.m3u8?stale=1',
          }}
          fitMode="cover"
          onError={onError}
        />
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(hlsAttachMediaMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(getCameraStreamUrlMock).toHaveBeenCalledWith(
        cameraEntityFixtures.normal.entity_id,
        'hls'
      );
      expect(hlsAttachMediaMock).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onError).toHaveBeenCalledWith('hls');
    } finally {
      vi.useRealTimers();
    }
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

  it('flushes pending WebRTC ICE candidates once the provider delivers a session id', async () => {
    render(
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

    const peerConnection = MockRTCPeerConnection.instances[0];
    expect(peerConnection).toBeTruthy();

    act(() => {
      peerConnection?.onicecandidate?.({
        candidate: {
          candidate: 'candidate:1',
          sdpMid: '0',
          toJSON: () => ({ candidate: 'candidate:1', sdpMid: '0' }),
        },
      } as never);
    });

    expect(addCameraWebRtcCandidateMock).not.toHaveBeenCalled();

    const subscribeCallback = subscribeCameraWebRtcOfferMock.mock.calls[0]?.[2] as
      | ((event: { type: 'session'; session_id: string }) => void)
      | undefined;

    act(() => {
      subscribeCallback?.({ type: 'session', session_id: 'session-1' });
    });

    await waitFor(() =>
      expect(addCameraWebRtcCandidateMock).toHaveBeenCalledWith(
        cameraEntityFixtures.normal.entity_id,
        'session-1',
        { candidate: 'candidate:1', sdpMid: '0' }
      )
    );
  });

  it('fails WebRTC immediately when the provider surfaces an explicit signaling error', async () => {
    const onError = vi.fn();

    render(
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

    const subscribeCallback = subscribeCameraWebRtcOfferMock.mock.calls[0]?.[2] as
      | ((event: { type: 'error'; code: string; message: string }) => void)
      | undefined;

    act(() => {
      subscribeCallback?.({
        type: 'error',
        code: 'webrtc_failed',
        message: 'ICE negotiation failed',
      });
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('web_rtc'));
  });

  it('queues remote WebRTC ICE candidates until the remote description is applied', async () => {
    render(
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

    const peerConnection = MockRTCPeerConnection.instances[0];
    expect(peerConnection).toBeTruthy();

    const subscribeCallback = subscribeCameraWebRtcOfferMock.mock.calls[0]?.[2] as
      | ((
          event:
            | { type: 'candidate'; candidate: RTCIceCandidateInit }
            | { type: 'answer'; answer: string }
        ) => void)
      | undefined;

    act(() => {
      subscribeCallback?.({
        type: 'candidate',
        candidate: { candidate: 'candidate:remote-1', sdpMid: '0' },
      });
    });

    expect(peerConnection?.addIceCandidate).not.toHaveBeenCalled();

    act(() => {
      subscribeCallback?.({ type: 'answer', answer: 'answer-sdp' });
    });

    await waitFor(() =>
      expect(peerConnection?.setRemoteDescription).toHaveBeenCalledWith({
        type: 'answer',
        sdp: 'answer-sdp',
      })
    );
    await waitFor(() =>
      expect(peerConnection?.addIceCandidate).toHaveBeenCalledWith({
        candidate: 'candidate:remote-1',
        sdpMid: '0',
      })
    );
  });

  it('extends the WebRTC startup timeout when signaling is still making progress', async () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();

      render(
        <CameraStreamPlayer
          entityId={cameraEntityFixtures.normal.entity_id}
          kind="web_rtc"
          posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
          fitMode="contain"
          onError={onError}
        />
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14_000);
      });

      expect(onError).not.toHaveBeenCalled();

      const subscribeCallback = subscribeCameraWebRtcOfferMock.mock.calls[0]?.[2] as
        | ((event: { type: 'answer'; answer: string }) => void)
        | undefined;

      act(() => {
        subscribeCallback?.({ type: 'answer', answer: 'answer-sdp' });
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14_000);
      });

      expect(onError).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });

      expect(onError).toHaveBeenCalledWith('web_rtc');
    } finally {
      vi.useRealTimers();
    }
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
