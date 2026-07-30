import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectGo2RtcCameraPlayer, resolveGo2RtcEndpoint } from '../direct-go2rtc-camera-player';

const { subscribeVisibilityAwareTaskMock, visibilityAwareTasks } = vi.hoisted(() => ({
  subscribeVisibilityAwareTaskMock: vi.fn(),
  visibilityAwareTasks: [] as Array<() => void>,
}));

vi.mock('@navet/app/utils/visibility-aware-scheduler', () => ({
  subscribeVisibilityAwareTask: subscribeVisibilityAwareTaskMock,
}));

type MockListener = (event: never) => void;

class MockEventTarget {
  private readonly listeners = new Map<string, Set<MockListener>>();

  addEventListener(type: string, listener: MockListener) {
    const listeners = this.listeners.get(type) ?? new Set<MockListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: MockListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as never);
    }
  }
}

class MockWebSocket extends MockEventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  binaryType: BinaryType = 'blob';
  readonly sent: string[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = vi.fn((message: unknown) => {
    this.sent.push(String(message));
  });

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open', new Event('open'));
  }

  message(data: string | ArrayBuffer) {
    this.emit('message', new MessageEvent('message', { data }));
  }

  error() {
    this.emit('error', new Event('error'));
  }
}

class MockMediaStreamTrack extends MockEventTarget {
  readonly kind: string;
  stop = vi.fn();

  constructor(kind: string) {
    super();
    this.kind = kind;
  }
}

class MockMediaStream {
  static instances: MockMediaStream[] = [];
  private readonly tracks: MockMediaStreamTrack[] = [];

  constructor() {
    MockMediaStream.instances.push(this);
  }

  addTrack(track: MockMediaStreamTrack) {
    this.tracks.push(track);
  }

  getTracks() {
    return this.tracks;
  }
}

class MockRTCPeerConnection extends MockEventTarget {
  static instances: MockRTCPeerConnection[] = [];

  connectionState: RTCPeerConnectionState = 'new';
  addTransceiver = vi.fn();
  close = vi.fn(() => {
    this.connectionState = 'closed';
  });
  createOffer = vi.fn(async () => ({ type: 'offer' as const, sdp: 'local-offer-sdp' }));
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => undefined);
  addIceCandidate = vi.fn(async () => undefined);

  constructor() {
    super();
    MockRTCPeerConnection.instances.push(this);
  }

  emitIceCandidate(candidate: string) {
    this.emit('icecandidate', {
      candidate: { candidate },
    });
  }

  emitTrack(track: MockMediaStreamTrack) {
    this.emit('track', { track });
  }
}

class MockSourceBuffer extends MockEventTarget {
  mode: AppendMode = 'segments';
  updating = false;
  buffered = {
    length: 0,
    start: vi.fn(),
    end: vi.fn(),
  } as unknown as TimeRanges;
  appendBuffer = vi.fn();
  remove = vi.fn();
}

class MockMediaSource extends MockEventTarget {
  static instances: MockMediaSource[] = [];
  static isTypeSupported = vi.fn((mimeType: string) => mimeType.includes('avc1.640029'));

  readyState: ReadyState = 'closed';
  readonly sourceBuffersCreated: MockSourceBuffer[] = [];
  addSourceBuffer = vi.fn((_mimeType: string) => {
    const sourceBuffer = new MockSourceBuffer();
    this.sourceBuffersCreated.push(sourceBuffer);
    return sourceBuffer;
  });
  removeSourceBuffer = vi.fn();

  constructor() {
    super();
    MockMediaSource.instances.push(this);
  }

  open() {
    this.readyState = 'open';
    this.emit('sourceopen', new Event('sourceopen'));
  }
}

const originalCreateObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const originalRequestVideoFrameCallbackDescriptor = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  'requestVideoFrameCallback'
);
const originalCancelVideoFrameCallbackDescriptor = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  'cancelVideoFrameCallback'
);
const originalDocumentHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');

let createObjectUrlMock: ReturnType<typeof vi.fn>;
let revokeObjectUrlMock: ReturnType<typeof vi.fn>;
let requestVideoFrameCallbackMock: ReturnType<typeof vi.fn>;
let cancelVideoFrameCallbackMock: ReturnType<typeof vi.fn>;
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

function createDirectStreamResource(
  url: string | undefined,
  mode: 'auto' | 'web_rtc' | 'mse' = 'auto'
): ResolvedPlatformResource {
  return {
    id: `camera.front:direct:${url ?? 'missing'}`,
    kind: 'webrtc_stream',
    url,
    cacheKey: `camera.front:direct:${url ?? 'missing'}`,
    authStrategy: 'none',
    metadata: {
      source: 'direct_stream_url',
      mode,
    },
  };
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

function renderDirectPlayer({
  url = 'http://go2rtc.local:1984/stream.html?src=front_door',
  mode = 'web_rtc',
  onLoad = vi.fn(),
  onError = vi.fn(),
}: {
  url?: string;
  mode?: 'auto' | 'web_rtc' | 'mse';
  onLoad?: () => void;
  onError?: () => void;
} = {}) {
  const renderResult = render(
    <DirectGo2RtcCameraPlayer
      posterUrl="/api/camera_proxy/camera.front"
      streamResource={createDirectStreamResource(url, mode)}
      fitMode="contain"
      onLoad={onLoad}
      onError={onError}
      loadingLabel="Loading camera"
      title="Front door live stream"
    />
  );

  return {
    ...renderResult,
    onLoad,
    onError,
    video: screen.getByLabelText('Front door live stream') as HTMLVideoElement,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  MockWebSocket.instances = [];
  MockRTCPeerConnection.instances = [];
  MockMediaStream.instances = [];
  MockMediaSource.instances = [];
  pendingFrameCallbacks.clear();
  nextFrameCallbackId = 1;
  visibilityAwareTasks.splice(0);

  subscribeVisibilityAwareTaskMock.mockImplementation((callback: () => void) => {
    visibilityAwareTasks.push(callback);
    return vi.fn(() => {
      const taskIndex = visibilityAwareTasks.indexOf(callback);
      if (taskIndex >= 0) {
        visibilityAwareTasks.splice(taskIndex, 1);
      }
    });
  });
  MockMediaSource.isTypeSupported.mockImplementation((mimeType: string) =>
    mimeType.includes('avc1.640029')
  );

  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
  vi.stubGlobal('MediaStream', MockMediaStream);
  vi.stubGlobal('MediaSource', MockMediaSource);

  createObjectUrlMock = vi.fn(() => 'blob:go2rtc-stream');
  revokeObjectUrlMock = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectUrlMock,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectUrlMock,
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

  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreProperty(URL, 'createObjectURL', originalCreateObjectUrlDescriptor);
  restoreProperty(URL, 'revokeObjectURL', originalRevokeObjectUrlDescriptor);
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

describe('resolveGo2RtcEndpoint', () => {
  it('derives a root WebSocket endpoint and preserves an encoded stream source', () => {
    const source = 'Front Door/HD?profile=main&audio=off';
    const resource = createDirectStreamResource(
      `http://go2rtc.local:1984/stream.html?src=${encodeURIComponent(source)}`,
      'web_rtc'
    );

    const endpoint = resolveGo2RtcEndpoint(resource);

    expect(endpoint).toEqual({
      mode: 'web_rtc',
      tcpOnly: false,
      webSocketUrl:
        'ws://go2rtc.local:1984/api/ws?src=Front+Door%2FHD%3Fprofile%3Dmain%26audio%3Doff',
    });
    expect(new URL(endpoint?.webSocketUrl ?? '').searchParams.get('src')).toBe(source);
  });

  it('keeps a reverse-proxy base path and upgrades HTTPS to WSS', () => {
    const endpoint = resolveGo2RtcEndpoint(
      createDirectStreamResource(
        'https://example.com/home/go2rtc/stream.html?src=camera%2Fgarage',
        'mse'
      )
    );

    expect(endpoint).toEqual({
      mode: 'mse',
      tcpOnly: false,
      webSocketUrl: 'wss://example.com/home/go2rtc/api/ws?src=camera%2Fgarage',
    });
  });

  it('preserves the explicit go2rtc TCP-only WebRTC policy', () => {
    const endpoint = resolveGo2RtcEndpoint(
      createDirectStreamResource(
        'http://go2rtc.local:1984/stream.html?src=front&mode=webrtc%2Cwebrtc%2Ftcp',
        'web_rtc'
      )
    );

    expect(endpoint?.tcpOnly).toBe(true);
  });

  it.each([
    'http://go2rtc.local:1984/stream.html',
    'http://go2rtc.local:1984/stream.html?src=',
    'http://go2rtc.local:1984/stream.html?src=%20',
    'http://go2rtc.local:1984/stream.html?src=front&src=back',
  ])('rejects a viewer URL with a missing or ambiguous src: %s', (url) => {
    expect(resolveGo2RtcEndpoint(createDirectStreamResource(url))).toBeNull();
  });
});

describe('DirectGo2RtcCameraPlayer', () => {
  it('completes WebRTC signaling and waits for a decoded frame before becoming ready', async () => {
    const { onLoad, onError, video } = renderDirectPlayer({ mode: 'web_rtc' });
    const socket = MockWebSocket.instances[0];
    const peerConnection = MockRTCPeerConnection.instances[0];
    expect(socket).toBeTruthy();
    expect(peerConnection).toBeTruthy();

    act(() => {
      socket?.open();
    });

    await waitFor(() =>
      expect(socket?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'webrtc/offer', value: 'local-offer-sdp' })
      )
    );
    expect(peerConnection?.addTransceiver).toHaveBeenCalledWith('video', {
      direction: 'recvonly',
    });
    expect(peerConnection?.addTransceiver).toHaveBeenCalledWith('audio', {
      direction: 'recvonly',
    });

    act(() => {
      socket?.message(JSON.stringify({ type: 'webrtc/answer', value: 'remote-answer-sdp' }));
      socket?.message(JSON.stringify({ type: 'webrtc/candidate', value: 'candidate:remote-1' }));
      peerConnection?.emitIceCandidate('candidate:local-1');
    });

    await waitFor(() =>
      expect(peerConnection?.setRemoteDescription).toHaveBeenCalledWith({
        type: 'answer',
        sdp: 'remote-answer-sdp',
      })
    );
    await waitFor(() =>
      expect(peerConnection?.addIceCandidate).toHaveBeenCalledWith({
        candidate: 'candidate:remote-1',
        sdpMid: '0',
      })
    );
    expect(socket?.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'webrtc/candidate', value: 'candidate:local-1' })
    );

    const videoTrack = new MockMediaStreamTrack('video');
    act(() => {
      peerConnection?.emitTrack(videoTrack);
    });

    expect(video.srcObject).toBe(MockMediaStream.instances[0]);
    expect(onLoad).not.toHaveBeenCalled();

    fireEvent.loadedData(video);
    expect(requestVideoFrameCallbackMock).toHaveBeenCalledTimes(1);
    expect(onLoad).not.toHaveBeenCalled();

    act(() => {
      deliverNextVideoFrame();
    });

    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    fireEvent.playing(video);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(video).toHaveStyle({ opacity: '1' });
  });

  it('never treats an audio-only media event as decoded video without frame callbacks', () => {
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback');
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback');
    const { onLoad, onError, video } = renderDirectPlayer({ mode: 'web_rtc' });
    const peerConnection = MockRTCPeerConnection.instances[0];
    setDecodedVideoEvidence(video, { decodedFrames: 0, height: 0, width: 0 });

    act(() => {
      peerConnection?.emitTrack(new MockMediaStreamTrack('audio'));
    });
    fireEvent.loadedData(video);
    fireEvent.canPlay(video);
    fireEvent.playing(video);

    expect(onLoad).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Loading camera' })).toBeInTheDocument();

    setDecodedVideoEvidence(video, { decodedFrames: 1, height: 720, width: 1280 });
    act(() => {
      peerConnection?.emitTrack(new MockMediaStreamTrack('video'));
    });
    fireEvent.loadedData(video);

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('stops per-frame callbacks after a decoded-frame counter becomes available', () => {
    const { onLoad, video } = renderDirectPlayer({ mode: 'web_rtc' });
    const peerConnection = MockRTCPeerConnection.instances[0];
    setDecodedVideoEvidence(video, { decodedFrames: 1, height: 720, width: 1280 });

    act(() => {
      peerConnection?.emitTrack(new MockMediaStreamTrack('video'));
      deliverNextVideoFrame();
    });

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(requestVideoFrameCallbackMock).toHaveBeenCalledTimes(1);
    expect(pendingFrameCallbacks.size).toBe(0);
  });

  it('fails a decoded stream when video frames stop even while media time advances', async () => {
    const { onLoad, onError, video } = renderDirectPlayer({ mode: 'web_rtc' });
    const peerConnection = MockRTCPeerConnection.instances[0];

    act(() => {
      peerConnection?.emitTrack(new MockMediaStreamTrack('video'));
      deliverNextVideoFrame();
    });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(visibilityAwareTasks).toHaveLength(1);

    await act(async () => {
      for (let checkIndex = 0; checkIndex < 4; checkIndex += 1) {
        video.currentTime = (checkIndex + 1) * 2;
        visibilityAwareTasks[0]?.();
      }
      await Promise.resolve();
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports a startup timeout once even when later WebSocket errors arrive', async () => {
    vi.useFakeTimers();
    const { onError } = renderDirectPlayer({ mode: 'web_rtc' });
    const socket = MockWebSocket.instances[0];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(onError).toHaveBeenCalledTimes(1);

    act(() => {
      socket?.error();
      socket?.error();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('ignores a decoded-frame callback from the previous Auto attempt', async () => {
    cancelVideoFrameCallbackMock.mockImplementation(() => undefined);
    const { onLoad, onError, video } = renderDirectPlayer({ mode: 'auto' });
    const webRtcSocket = MockWebSocket.instances[0];
    expect(pendingFrameCallbacks.size).toBe(1);

    act(() => {
      webRtcSocket?.error();
    });

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(2);
      expect(MockMediaSource.instances).toHaveLength(1);
      expect(pendingFrameCallbacks.size).toBe(2);
    });

    act(() => {
      deliverNextVideoFrame();
    });
    expect(onLoad).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    const mseSocket = MockWebSocket.instances[1];
    const mediaSource = MockMediaSource.instances[0];
    const segment = new Uint8Array([1, 2, 3, 4]).buffer;
    const mimeType = 'video/mp4; codecs="avc1.640029"';
    act(() => {
      mseSocket?.open();
      mediaSource?.open();
      mseSocket?.message(segment);
      mseSocket?.message(JSON.stringify({ type: 'mse', value: mimeType }));
      deliverNextVideoFrame();
    });

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(video).toHaveStyle({ opacity: '1' });
  });

  it('falls back from WebRTC to MSE in Auto mode before reporting an outer error', async () => {
    const { onError } = renderDirectPlayer({ mode: 'auto' });
    const webRtcSocket = MockWebSocket.instances[0];
    const peerConnection = MockRTCPeerConnection.instances[0];

    act(() => {
      webRtcSocket?.error();
    });

    expect(onError).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(peerConnection?.close).toHaveBeenCalledTimes(1);
      expect(MockWebSocket.instances).toHaveLength(2);
      expect(MockMediaSource.instances).toHaveLength(1);
    });

    const mseSocket = MockWebSocket.instances[1];
    expect(mseSocket?.binaryType).toBe('arraybuffer');

    await act(async () => {
      mseSocket?.error();
      mseSocket?.error();
      await Promise.resolve();
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('performs the MSE handshake, appends binary media, becomes ready, and cleans up', async () => {
    const { onLoad, onError, unmount, video } = renderDirectPlayer({ mode: 'mse' });
    const socket = MockWebSocket.instances[0];
    const mediaSource = MockMediaSource.instances[0];
    expect(socket).toBeTruthy();
    expect(mediaSource).toBeTruthy();
    expect(socket?.binaryType).toBe('arraybuffer');
    expect(video).toHaveAttribute('src', 'blob:go2rtc-stream');

    act(() => {
      socket?.open();
    });
    expect(socket?.send).not.toHaveBeenCalled();

    act(() => {
      mediaSource?.open();
    });
    expect(socket?.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'mse', value: 'avc1.640029' })
    );

    const segment = new Uint8Array([1, 2, 3, 4]).buffer;
    const mimeType = 'video/mp4; codecs="avc1.640029"';
    act(() => {
      socket?.message(segment);
      socket?.message(JSON.stringify({ type: 'mse', value: mimeType }));
    });

    expect(mediaSource?.addSourceBuffer).toHaveBeenCalledWith(mimeType);
    const sourceBuffer = mediaSource?.sourceBuffersCreated[0];
    expect(sourceBuffer?.mode).toBe('segments');
    expect(sourceBuffer?.appendBuffer).toHaveBeenCalledWith(segment);
    expect(onLoad).not.toHaveBeenCalled();

    fireEvent.loadedData(video);
    act(() => {
      deliverNextVideoFrame();
    });

    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    expect(onError).not.toHaveBeenCalled();

    unmount();

    expect(socket?.close).toHaveBeenCalledTimes(1);
    expect(mediaSource?.removeSourceBuffer).toHaveBeenCalledWith(sourceBuffer);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:go2rtc-stream');
  });
});
