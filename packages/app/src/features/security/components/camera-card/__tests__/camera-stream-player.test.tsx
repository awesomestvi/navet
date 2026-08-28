import { cameraEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/camera';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../direct-go2rtc-camera-player', () => ({
  DirectGo2RtcCameraPlayer: ({
    streamResource,
    title,
    onLoad,
    onError,
  }: {
    streamResource: { url?: string; metadata?: { mode?: string } };
    title: string;
    onLoad?: () => void;
    onError: () => void;
  }) => (
    <fieldset
      aria-label={title}
      data-stream-mode={streamResource.metadata?.mode}
      data-stream-url={streamResource.url}
    >
      <button type="button" aria-label="Mock direct stream loaded" onClick={onLoad} />
      <button type="button" aria-label="Mock direct stream failed" onClick={onError} />
    </fieldset>
  ),
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

const originalRequestVideoFrameCallbackDescriptor = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  'requestVideoFrameCallback'
);
const originalCancelVideoFrameCallbackDescriptor = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  'cancelVideoFrameCallback'
);
const originalDocumentHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');

let cancelVideoFrameCallbackMock: ReturnType<typeof vi.fn>;
let requestVideoFrameCallbackMock: ReturnType<typeof vi.fn>;
let nextFrameCallbackId = 1;
const pendingFrameCallbacks = new Map<number, VideoFrameRequestCallback>();

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
  } else {
    Reflect.deleteProperty(target, property);
  }
}

function deliverNextVideoFrame(
  metadata: VideoFrameCallbackMetadata = {
    height: 720,
    presentedFrames: 1,
    width: 1280,
  } as VideoFrameCallbackMetadata
) {
  const nextFrame = pendingFrameCallbacks.entries().next().value as
    | [number, VideoFrameRequestCallback]
    | undefined;
  expect(nextFrame).toBeTruthy();
  if (!nextFrame) {
    return;
  }
  pendingFrameCallbacks.delete(nextFrame[0]);
  nextFrame[1](0, metadata);
}

function setDecodedVideoEvidence(
  video: HTMLVideoElement,
  input: { decodedFrames: number; height: number; width: number }
) {
  Object.defineProperties(video, {
    getVideoPlaybackQuality: {
      configurable: true,
      value: () =>
        ({
          totalVideoFrames: input.decodedFrames,
        }) as VideoPlaybackQuality,
    },
    videoHeight: {
      configurable: true,
      value: input.height,
    },
    videoWidth: {
      configurable: true,
      value: input.width,
    },
  });
}

describe('CameraStreamPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hlsInstances.length = 0;
    MockRTCPeerConnection.instances = [];
    pendingFrameCallbacks.clear();
    nextFrameCallbackId = 1;
    getCameraStreamUrlMock.mockResolvedValue({ url: '/api/hls/camera.front/master.m3u8' });
    resolveCameraStreamResourceMock.mockResolvedValue({
      url: '/api/hls/camera.front/master.m3u8',
    });
    getWebRtcClientConfigurationMock.mockResolvedValue({ configuration: {} });
    subscribeCameraWebRtcOfferMock.mockResolvedValue(vi.fn());
    addCameraWebRtcCandidateMock.mockResolvedValue(undefined);
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
    requestVideoFrameCallbackMock = vi.fn((callback: VideoFrameRequestCallback) => {
      const callbackId = nextFrameCallbackId++;
      pendingFrameCallbacks.set(callbackId, callback);
      return callbackId;
    });
    cancelVideoFrameCallbackMock = vi.fn((callbackId: number) => {
      pendingFrameCallbacks.delete(callbackId);
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
      configurable: true,
      value: requestVideoFrameCallbackMock,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', {
      configurable: true,
      value: cancelVideoFrameCallbackMock,
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    vi.stubGlobal('MediaStream', MockMediaStream);
    vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
    vi.stubGlobal('RTCSessionDescription', MockRTCSessionDescription);
    vi.stubGlobal('RTCIceCandidate', MockRTCIceCandidate);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    restoreProperty(
      HTMLVideoElement.prototype,
      'requestVideoFrameCallback',
      originalRequestVideoFrameCallbackDescriptor
    );
    restoreProperty(
      HTMLVideoElement.prototype,
      'cancelVideoFrameCallback',
      originalCancelVideoFrameCallbackDescriptor
    );
    restoreProperty(document, 'hidden', originalDocumentHiddenDescriptor);
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
    expect(container.querySelector('video')).not.toHaveAttribute('poster');
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

  it('forces provider MSE playback through hls.js and reports MSE failures distinctly', async () => {
    const onError = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'canPlayType', {
      configurable: true,
      value: vi.fn(() => 'maybe'),
    });

    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="mse"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        streamResource={{
          id: 'camera.front:mse',
          kind: 'hls_stream',
          cacheKey: 'camera.front:mse',
          authStrategy: 'same_origin',
          url: '/api/hls/camera.front/master.m3u8',
          metadata: {
            source: 'provider_hls',
            mode: 'mse',
          },
        }}
        fitMode="cover"
        onError={onError}
      />
    );

    await waitFor(() => expect(hlsAttachMediaMock).toHaveBeenCalled());
    fireEvent.error(container.querySelector('video') as HTMLVideoElement);

    expect(onError).toHaveBeenCalledWith('mse');
    expect(getCameraStreamUrlMock).not.toHaveBeenCalled();
  });

  it('routes a resolved go2rtc resource through the native direct player', () => {
    const onLoad = vi.fn();
    const streamUrl = `${window.location.origin}/stream.html?src=camera_bedroom`;
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        streamResource={{
          id: 'camera.front:go2rtc:camera_bedroom',
          kind: 'webrtc_stream',
          cacheKey: 'camera.front:go2rtc:camera_bedroom',
          authStrategy: 'none',
          url: streamUrl,
        }}
        fitMode="contain"
        onLoad={onLoad}
        onError={vi.fn()}
      />
    );

    const video = screen.getByLabelText('Camera WebRTC stream');
    expect(video).toHaveAttribute('data-stream-url', streamUrl);
    expect(container.querySelector('iframe')).toBeNull();
    expect(getWebRtcClientConfigurationMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Mock direct stream loaded' }));

    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('keeps cross-origin MSE viewers in an iframe without claiming decoded playback', () => {
    const onLoad = vi.fn();
    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        streamResource={{
          id: 'camera.front:direct:mse',
          kind: 'webrtc_stream',
          cacheKey: 'camera.front:direct:mse',
          authStrategy: 'none',
          url: 'http://192.168.68.71:1984/stream.html?src=camera_bedroom&mode=mse',
          metadata: {
            source: 'direct_stream_url',
            mode: 'mse',
          },
        }}
        fitMode="contain"
        onLoad={onLoad}
        onError={vi.fn()}
      />
    );

    const iframe = screen.getByTitle('Camera WebRTC stream');
    expect(iframe).toHaveAttribute(
      'src',
      'http://192.168.68.71:1984/stream.html?src=camera_bedroom&mode=mse'
    );
    expect(
      screen.queryByRole('button', { name: 'Mock direct stream loaded' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();

    fireEvent.load(iframe);

    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.queryByRole('status', { name: 'Loading camera feed' })).not.toBeInTheDocument();
  });

  it('updates the native direct player when only its configured mode changes', () => {
    const streamUrl = `${window.location.origin}/stream.html?src=camera_bedroom`;
    const onError = vi.fn();
    const createProps = (mode: 'auto' | 'mse') => ({
      entityId: cameraEntityFixtures.normal.entity_id,
      kind: 'web_rtc' as const,
      posterUrl: cameraEntityFixtures.relativeUrl.attributes.entity_picture as string,
      streamResource: {
        id: 'camera.front:direct',
        kind: 'webrtc_stream' as const,
        cacheKey: 'camera.front:direct',
        authStrategy: 'none' as const,
        url: streamUrl,
        metadata: {
          source: 'direct_stream_url',
          mode,
        },
      },
      fitMode: 'contain' as const,
      onError,
    });
    const { rerender } = render(<CameraStreamPlayer {...createProps('auto')} />);

    expect(screen.getByLabelText('Camera WebRTC stream')).toHaveAttribute(
      'data-stream-mode',
      'auto'
    );

    rerender(<CameraStreamPlayer {...createProps('mse')} />);

    expect(screen.getByLabelText('Camera WebRTC stream')).toHaveAttribute(
      'data-stream-mode',
      'mse'
    );
  });

  it('keeps loading until a provider video track produces a decoded frame', async () => {
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
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'audio' } as MediaStreamTrack,
      });
      deliverNextVideoFrame();
    });

    expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();

    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
      deliverNextVideoFrame();
    });

    expect(screen.queryByRole('status', { name: 'Loading camera feed' })).not.toBeInTheDocument();
  });

  it('uses decoded-frame counters without treating audio-only media as ready', async () => {
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback');
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback');
    const onLoad = vi.fn();
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onLoad={onLoad}
        onError={vi.fn()}
      />
    );

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled());
    const video = container.querySelector('video') as HTMLVideoElement;
    setDecodedVideoEvidence(video, { decodedFrames: 0, height: 0, width: 0 });

    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'audio' } as MediaStreamTrack,
      });
    });
    fireEvent.loadedData(video);
    fireEvent.playing(video);

    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Loading camera feed' })).toBeInTheDocument();

    setDecodedVideoEvidence(video, { decodedFrames: 1, height: 720, width: 1280 });
    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
    });
    fireEvent.loadedData(video);

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status', { name: 'Loading camera feed' })).not.toBeInTheDocument();
  });

  it('stops per-frame callbacks after a decoded-frame counter becomes available', async () => {
    const onLoad = vi.fn();
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onLoad={onLoad}
        onError={vi.fn()}
      />
    );

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled());
    const video = container.querySelector('video') as HTMLVideoElement;
    setDecodedVideoEvidence(video, { decodedFrames: 1, height: 720, width: 1280 });

    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
      deliverNextVideoFrame();
    });

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(requestVideoFrameCallbackMock).toHaveBeenCalledTimes(1);
    expect(pendingFrameCallbacks.size).toBe(0);
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

  it('retries one failed mjpeg request before entering the transport fallback chain', () => {
    const onError = vi.fn();
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="mjpeg"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        streamResource={{
          id: 'camera.front:mjpeg',
          kind: 'mjpeg_stream',
          cacheKey: 'camera.front:mjpeg',
          authStrategy: 'same_origin',
          url: '/api/camera_proxy_stream/camera.front',
        }}
        fitMode="contain"
        onError={onError}
      />
    );

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(onError).not.toHaveBeenCalled();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/camera_proxy_stream/camera.front?_mjpeg_t=1'
    );

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('mjpeg');
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

  it('reports a rejected provider WebRTC subscription exactly once', async () => {
    const onError = vi.fn();
    subscribeCameraWebRtcOfferMock.mockRejectedValueOnce(new Error('Subscription failed'));

    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onError={onError}
      />
    );

    await waitFor(() => expect(onError).toHaveBeenCalledWith('web_rtc'));
    expect(onError).toHaveBeenCalledTimes(1);

    act(() => {
      const peerConnection = MockRTCPeerConnection.instances[0];
      if (peerConnection) {
        peerConnection.iceConnectionState = 'failed';
        peerConnection.oniceconnectionstatechange?.();
      }
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports rejected local WebRTC candidates through the current generation once', async () => {
    const onError = vi.fn();
    addCameraWebRtcCandidateMock.mockRejectedValue(new Error('Candidate rejected'));

    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onError={onError}
      />
    );

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled());
    const subscribeCallback = subscribeCameraWebRtcOfferMock.mock.calls[0]?.[2] as
      | ((event: { type: 'session'; session_id: string }) => void)
      | undefined;
    act(() => {
      subscribeCallback?.({ type: 'session', session_id: 'session-1' });
      MockRTCPeerConnection.instances[0]?.onicecandidate?.({
        candidate: {
          candidate: 'candidate:local-1',
          toJSON: () => ({ candidate: 'candidate:local-1', sdpMid: '0' }),
        },
      } as never);
      MockRTCPeerConnection.instances[0]?.onicecandidate?.({
        candidate: {
          candidate: 'candidate:local-2',
          toJSON: () => ({ candidate: 'candidate:local-2', sdpMid: '0' }),
        },
      } as never);
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('web_rtc'));
    expect(addCameraWebRtcCandidateMock).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('falls back immediately when the WebRTC ICE connection fails', async () => {
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

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled());
    const peerConnection = MockRTCPeerConnection.instances[0];

    act(() => {
      if (peerConnection) {
        peerConnection.iceConnectionState = 'failed';
        peerConnection.oniceconnectionstatechange?.();
      }
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('web_rtc');
  });

  it('reports media, ICE, and startup failures through one WebRTC error', async () => {
    vi.useFakeTimers();
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

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled();

    const peerConnection = MockRTCPeerConnection.instances[0];
    act(() => {
      peerConnection?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
      fireEvent.error(container.querySelector('video') as HTMLVideoElement);
      if (peerConnection) {
        peerConnection.iceConnectionState = 'failed';
        peerConnection.oniceconnectionstatechange?.();
      }
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('web_rtc');
  });

  it('allows transient WebRTC disconnects to recover within the grace period', async () => {
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

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled());
    const peerConnection = MockRTCPeerConnection.instances[0];
    vi.useFakeTimers();
    try {
      act(() => {
        if (peerConnection) {
          peerConnection.iceConnectionState = 'disconnected';
          peerConnection.oniceconnectionstatechange?.();
          peerConnection.iceConnectionState = 'connected';
          peerConnection.oniceconnectionstatechange?.();
        }
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
      });

      expect(onError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores stale media and frame events from before a visibility restart', async () => {
    cancelVideoFrameCallbackMock.mockImplementation(() => undefined);
    const onLoad = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onLoad={onLoad}
        onError={onError}
      />
    );

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalledTimes(1));
    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalledTimes(2);
      expect(MockRTCPeerConnection.instances).toHaveLength(2);
    });
    fireEvent.error(container.querySelector('video') as HTMLVideoElement);
    expect(onError).not.toHaveBeenCalled();

    act(() => {
      MockRTCPeerConnection.instances[1]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
    });
    expect(pendingFrameCallbacks.size).toBe(2);

    act(() => {
      deliverNextVideoFrame();
    });
    expect(onLoad).not.toHaveBeenCalled();

    act(() => {
      deliverNextVideoFrame();
    });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores an ended audio track while the WebRTC video track remains available', async () => {
    const onError = vi.fn();
    const audioEndedListener = vi.fn();
    const videoEndedListener = vi.fn();

    render(
      <CameraStreamPlayer
        entityId={cameraEntityFixtures.normal.entity_id}
        kind="web_rtc"
        posterUrl={cameraEntityFixtures.relativeUrl.attributes.entity_picture as string}
        fitMode="contain"
        onError={onError}
      />
    );

    await waitFor(() => expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled());
    const peerConnection = MockRTCPeerConnection.instances[0];

    act(() => {
      peerConnection?.ontrack?.({
        track: {
          kind: 'audio',
          addEventListener: audioEndedListener,
        } as unknown as MediaStreamTrack,
      });
      peerConnection?.ontrack?.({
        track: {
          kind: 'video',
          addEventListener: videoEndedListener,
        } as unknown as MediaStreamTrack,
      });
    });

    expect(audioEndedListener).not.toHaveBeenCalled();
    expect(videoEndedListener).toHaveBeenCalledWith('ended', expect.any(Function), {
      once: true,
    });
    expect(onError).not.toHaveBeenCalled();
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

  it('normalizes and queues remote WebRTC ICE candidates until the remote description is applied', async () => {
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
        candidate: { candidate: 'candidate:remote-1' },
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

  it('reports rejected remote WebRTC ICE candidates through the fallback path once', async () => {
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
      subscribeCallback?.({ type: 'answer', answer: 'answer-sdp' });
    });

    await waitFor(() =>
      expect(peerConnection?.setRemoteDescription).toHaveBeenCalledWith({
        type: 'answer',
        sdp: 'answer-sdp',
      })
    );

    peerConnection?.addIceCandidate.mockRejectedValue(new Error('Invalid ICE candidate'));

    act(() => {
      subscribeCallback?.({
        type: 'candidate',
        candidate: { candidate: 'candidate:remote-1' },
      });
      subscribeCallback?.({
        type: 'candidate',
        candidate: { candidate: 'candidate:remote-2' },
      });
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('web_rtc'));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(peerConnection?.addIceCandidate).toHaveBeenNthCalledWith(1, {
      candidate: 'candidate:remote-1',
      sdpMid: '0',
    });
    expect(peerConnection?.addIceCandidate).toHaveBeenNthCalledWith(2, {
      candidate: 'candidate:remote-2',
      sdpMid: '0',
    });
  });

  it('falls back after an absolute WebRTC no-frame deadline despite signaling progress', async () => {
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
        await vi.advanceTimersByTimeAsync(3_000);
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
        await vi.advanceTimersByTimeAsync(2_000);
      });

      expect(onError).toHaveBeenCalledWith('web_rtc');
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back when decoded WebRTC frames stop even while currentTime advances', async () => {
    vi.useFakeTimers();
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

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled();

    const video = container.querySelector('video') as HTMLVideoElement;
    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
      deliverNextVideoFrame();
    });
    expect(onError).not.toHaveBeenCalled();

    for (let checkIndex = 0; checkIndex < 4; checkIndex += 1) {
      video.currentTime = (checkIndex + 1) * 2;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
    }

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('web_rtc');
  });

  it('keeps WebRTC healthy while decoded frames progress with static currentTime', async () => {
    vi.useFakeTimers();
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

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(subscribeCameraWebRtcOfferMock).toHaveBeenCalled();

    const video = container.querySelector('video') as HTMLVideoElement;
    act(() => {
      MockRTCPeerConnection.instances[0]?.ontrack?.({
        track: { kind: 'video' } as MediaStreamTrack,
      });
      deliverNextVideoFrame();
    });
    expect(video.currentTime).toBe(0);

    for (let checkIndex = 0; checkIndex < 5; checkIndex += 1) {
      act(() => {
        deliverNextVideoFrame({
          height: 720,
          presentedFrames: checkIndex + 2,
          width: 1280,
        } as VideoFrameCallbackMetadata);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
    }

    expect(video.currentTime).toBe(0);
    expect(onError).not.toHaveBeenCalled();
  });
});
