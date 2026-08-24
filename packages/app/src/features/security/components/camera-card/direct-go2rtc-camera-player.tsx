import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { subscribeVisibilityAwareTask } from '@navet/app/utils/visibility-aware-scheduler';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraStreamLoadingIndicator } from './camera-stream-loading-indicator';

type DirectGo2RtcMode = 'auto' | 'web_rtc' | 'mse';
type DirectGo2RtcAttemptMode = Exclude<DirectGo2RtcMode, 'auto'>;
type DirectGo2RtcConfiguredMode = NonNullable<ResolvedPlatformResource['metadata']>['mode'];

interface DirectGo2RtcCameraPlayerProps {
  posterUrl: string | undefined;
  streamResource: ResolvedPlatformResource;
  fitMode: 'cover' | 'contain';
  onLoad?: () => void;
  onError: () => void;
  loadingLabel: string;
  title: string;
}

interface Go2RtcEndpoint {
  mode: DirectGo2RtcMode;
  tcpOnly: boolean;
  webSocketUrl: string;
}

interface DirectGo2RtcAttempt {
  cleanup: () => void;
  hasVideoSource: () => boolean;
  markReady: () => void;
  ownsVideoElement: () => boolean;
}

const DIRECT_GO2RTC_STARTUP_TIMEOUT_MS = 10_000;
const DIRECT_GO2RTC_DISCONNECTED_GRACE_MS = 3_000;
const DIRECT_GO2RTC_STALL_CHECK_INTERVAL_MS = 2_000;
const DIRECT_GO2RTC_STALL_THRESHOLD_MS = 6_000;
const DIRECT_GO2RTC_BUFFER_WINDOW_SECONDS = 5;
const DIRECT_GO2RTC_MAX_QUEUED_BYTES = 4 * 1024 * 1024;
const DIRECT_GO2RTC_MSE_CODECS = [
  'avc1.640029',
  'avc1.64002A',
  'avc1.640033',
  'hvc1.1.6.L153.B0',
  'mp4a.40.2',
  'mp4a.40.5',
  'opus',
];

const videoFitClassNames = {
  contain: 'object-contain',
  cover: 'object-cover',
} as const;

function getDirectGo2RtcMode(mode: DirectGo2RtcConfiguredMode): DirectGo2RtcMode {
  return mode === 'web_rtc' || mode === 'mse' ? mode : 'auto';
}

function resolveGo2RtcEndpointFromUrl(
  resourceUrl: string | undefined,
  resourceMode: DirectGo2RtcConfiguredMode
): Go2RtcEndpoint | null {
  if (!resourceUrl) {
    return null;
  }

  try {
    const viewerUrl = new URL(resourceUrl, window.location.href);
    if (viewerUrl.protocol !== 'http:' && viewerUrl.protocol !== 'https:') {
      return null;
    }

    const streamSources = viewerUrl.searchParams
      .getAll('src')
      .map((source) => source.trim())
      .filter(Boolean);
    if (streamSources.length !== 1) {
      return null;
    }

    const webSocketUrl = new URL('api/ws', viewerUrl);
    webSocketUrl.protocol = viewerUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    webSocketUrl.search = '';
    webSocketUrl.searchParams.set('src', streamSources[0] as string);

    return {
      mode: getDirectGo2RtcMode(resourceMode),
      tcpOnly: viewerUrl.searchParams
        .getAll('mode')
        .some((mode) => mode.split(',').includes('webrtc/tcp')),
      webSocketUrl: webSocketUrl.toString(),
    };
  } catch {
    return null;
  }
}

export function resolveGo2RtcEndpoint(resource: ResolvedPlatformResource): Go2RtcEndpoint | null {
  return resolveGo2RtcEndpointFromUrl(resource.url, resource.metadata?.mode);
}

function sendWebSocketMessage(socket: WebSocket, message: Record<string, string>) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function parseGo2RtcMessage(event: MessageEvent) {
  if (typeof event.data !== 'string') {
    return null;
  }

  try {
    const value = JSON.parse(event.data) as { type?: unknown; value?: unknown };
    return {
      type: typeof value.type === 'string' ? value.type : '',
      value: typeof value.value === 'string' ? value.value : '',
    };
  } catch {
    return null;
  }
}

function getSupportedMseCodecs(isTypeSupported: (type: string) => boolean) {
  return DIRECT_GO2RTC_MSE_CODECS.filter((codec) =>
    isTypeSupported(`video/mp4; codecs="${codec}"`)
  ).join();
}

function getDecodedVideoFrameCount(video: HTMLVideoElement) {
  const playbackQuality = video.getVideoPlaybackQuality?.();
  if (
    playbackQuality &&
    Number.isFinite(playbackQuality.totalVideoFrames) &&
    playbackQuality.totalVideoFrames >= 0
  ) {
    return playbackQuality.totalVideoFrames;
  }

  const legacyDecodedFrameCount = (
    video as HTMLVideoElement & {
      webkitDecodedFrameCount?: number;
    }
  ).webkitDecodedFrameCount;
  return typeof legacyDecodedFrameCount === 'number' &&
    Number.isFinite(legacyDecodedFrameCount) &&
    legacyDecodedFrameCount >= 0
    ? legacyDecodedFrameCount
    : null;
}

function hasDecodedVideoDimensions(video: HTMLVideoElement, metadata?: VideoFrameCallbackMetadata) {
  const width = metadata?.width ?? video.videoWidth;
  const height = metadata?.height ?? video.videoHeight;
  return width > 0 && height > 0;
}

export function DirectGo2RtcCameraPlayer({
  posterUrl,
  streamResource,
  fitMode,
  onLoad,
  onError,
  loadingLabel,
  title,
}: DirectGo2RtcCameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const hasLoadedFrameRef = useRef(false);
  const markReadyRef = useRef<() => void>(() => undefined);
  const resourceUrl = streamResource.url;
  const resourceMode = streamResource.metadata?.mode;
  const endpoint = useMemo(
    () => resolveGo2RtcEndpointFromUrl(resourceUrl, resourceMode),
    [resourceMode, resourceUrl]
  );

  markReadyRef.current = () => {
    if (hasLoadedFrameRef.current) {
      return;
    }
    hasLoadedFrameRef.current = true;
    setHasLoadedFrame(true);
    onLoad?.();
  };
  useEffect(() => {
    const video = videoRef.current;
    if (!endpoint || !video || typeof WebSocket === 'undefined') {
      onError();
      return;
    }

    let cancelled = false;
    let playbackGeneration = 0;
    let activeAttemptCleanup: (() => void) | null = null;
    let pendingAttemptStart: number | null = null;
    const attemptModes: DirectGo2RtcAttemptMode[] =
      endpoint.mode === 'auto' ? ['web_rtc', 'mse'] : [endpoint.mode];

    const clearPendingAttemptStart = () => {
      if (pendingAttemptStart !== null) {
        window.clearTimeout(pendingAttemptStart);
        pendingAttemptStart = null;
      }
    };

    const resetVideo = () => {
      video.pause();
      video.disableRemotePlayback = false;
      video.srcObject = null;
      video.removeAttribute('src');
      video.removeAttribute('poster');
      video.load();
    };

    const startWebRtcAttempt = (generation: number, fail: () => void): DirectGo2RtcAttempt => {
      const socket = new WebSocket(endpoint.webSocketUrl);
      const peerConnection = new RTCPeerConnection({
        bundlePolicy: 'max-bundle',
        iceServers: [
          {
            urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
          },
        ],
      });
      const remoteStream = new MediaStream();
      const pendingRemoteCandidates: string[] = [];
      let failed = false;
      let ready = false;
      let hasRemoteVideoTrack = false;
      let remoteDescriptionReady = false;
      let disconnectedTimeout: number | null = null;
      let startupTimeout: number | null = null;
      const isActive = () => !cancelled && generation === playbackGeneration;
      const failOnce = () => {
        if (failed || !isActive()) {
          return;
        }
        failed = true;
        fail();
      };
      startupTimeout = window.setTimeout(failOnce, DIRECT_GO2RTC_STARTUP_TIMEOUT_MS);

      socket.addEventListener('open', () => {
        void (async () => {
          try {
            peerConnection.addTransceiver('video', { direction: 'recvonly' });
            peerConnection.addTransceiver('audio', { direction: 'recvonly' });
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            if (!offer.sdp || !isActive()) {
              return;
            }
            sendWebSocketMessage(socket, { type: 'webrtc/offer', value: offer.sdp });
          } catch {
            failOnce();
          }
        })();
      });
      socket.addEventListener('message', (event) => {
        const message = parseGo2RtcMessage(event);
        if (!message || !isActive()) {
          return;
        }

        if (message.type === 'webrtc/answer') {
          void peerConnection
            .setRemoteDescription({ type: 'answer', sdp: message.value })
            .then(async () => {
              if (!isActive()) {
                return;
              }
              remoteDescriptionReady = true;
              for (const candidate of pendingRemoteCandidates.splice(0)) {
                await peerConnection.addIceCandidate({ candidate, sdpMid: '0' });
              }
            })
            .catch(failOnce);
        } else if (message.type === 'webrtc/candidate') {
          if (endpoint.tcpOnly && message.value.includes(' udp ')) {
            return;
          }
          if (!remoteDescriptionReady) {
            pendingRemoteCandidates.push(message.value);
            return;
          }
          void peerConnection
            .addIceCandidate({ candidate: message.value, sdpMid: '0' })
            .catch(failOnce);
        } else if (message.type === 'error' && message.value.includes('webrtc/offer')) {
          failOnce();
        }
      });
      socket.addEventListener('error', failOnce);
      socket.addEventListener('close', () => {
        if (!ready) {
          failOnce();
        }
      });

      peerConnection.addEventListener('icecandidate', (event) => {
        if (!isActive()) {
          return;
        }
        if (endpoint.tcpOnly && event.candidate?.protocol === 'udp') {
          return;
        }
        sendWebSocketMessage(socket, {
          type: 'webrtc/candidate',
          value: event.candidate?.candidate ?? '',
        });
      });
      peerConnection.addEventListener('track', (event) => {
        if (!isActive()) {
          return;
        }
        remoteStream.addTrack(event.track);
        if (event.track.kind === 'video') {
          hasRemoteVideoTrack = true;
          event.track.addEventListener('ended', failOnce, { once: true });
        }
        video.srcObject = remoteStream;
        void video.play().catch(() => undefined);
      });
      peerConnection.addEventListener('connectionstatechange', () => {
        if (!isActive()) {
          return;
        }
        if (peerConnection.connectionState !== 'disconnected' && disconnectedTimeout !== null) {
          window.clearTimeout(disconnectedTimeout);
          disconnectedTimeout = null;
        }
        if (peerConnection.connectionState === 'disconnected' && disconnectedTimeout === null) {
          disconnectedTimeout = window.setTimeout(failOnce, DIRECT_GO2RTC_DISCONNECTED_GRACE_MS);
        } else if (
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed'
        ) {
          failOnce();
        }
      });

      return {
        cleanup: () => {
          failed = true;
          if (startupTimeout !== null) {
            window.clearTimeout(startupTimeout);
          }
          if (disconnectedTimeout !== null) {
            window.clearTimeout(disconnectedTimeout);
          }
          socket.close();
          remoteStream.getTracks().forEach((track) => {
            track.stop();
          });
          peerConnection.close();
        },
        hasVideoSource: () => hasRemoteVideoTrack,
        markReady: () => {
          ready = true;
          if (startupTimeout !== null) {
            window.clearTimeout(startupTimeout);
            startupTimeout = null;
          }
        },
        ownsVideoElement: () => video.srcObject === remoteStream,
      };
    };

    const startMseAttempt = (generation: number, fail: () => void): DirectGo2RtcAttempt => {
      const managedMediaSource = (
        window as typeof window & {
          ManagedMediaSource?: typeof MediaSource;
        }
      ).ManagedMediaSource;
      const MediaSourceConstructor = managedMediaSource ?? MediaSource;
      const socket = new WebSocket(endpoint.webSocketUrl);
      socket.binaryType = 'arraybuffer';
      const mediaSource = new MediaSourceConstructor();
      const objectUrl = managedMediaSource ? null : URL.createObjectURL(mediaSource);
      let sourceBuffer: SourceBuffer | null = null;
      const queuedSegments: ArrayBuffer[] = [];
      let queuedBytes = 0;
      let failed = false;
      let sourceOpen = false;
      let socketOpen = false;
      let requestSent = false;
      let startupTimeout: number | null = null;
      const isActive = () => !cancelled && generation === playbackGeneration;
      const failOnce = () => {
        if (failed || !isActive()) {
          return;
        }
        failed = true;
        fail();
      };
      startupTimeout = window.setTimeout(failOnce, DIRECT_GO2RTC_STARTUP_TIMEOUT_MS);
      const requestMseStream = () => {
        if (!sourceOpen || !socketOpen || requestSent) {
          return;
        }
        requestSent = true;
        sendWebSocketMessage(socket, {
          type: 'mse',
          value: getSupportedMseCodecs(
            MediaSourceConstructor.isTypeSupported.bind(MediaSourceConstructor)
          ),
        });
      };
      const appendNextSegment = () => {
        if (!sourceBuffer || sourceBuffer.updating || !isActive()) {
          return;
        }

        if (sourceBuffer.buffered.length > 0) {
          const start = sourceBuffer.buffered.start(0);
          const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
          const trimEnd = end - DIRECT_GO2RTC_BUFFER_WINDOW_SECONDS;
          if (trimEnd > start) {
            try {
              sourceBuffer.remove(start, trimEnd);
              return;
            } catch {
              // The next update cycle can retry trimming.
            }
          }
          if (video.currentTime < trimEnd) {
            video.currentTime = trimEnd;
          }
        }

        const segment = queuedSegments.shift();
        if (segment) {
          queuedBytes -= segment.byteLength;
          try {
            sourceBuffer.appendBuffer(segment);
          } catch {
            failOnce();
          }
        }
      };

      if (managedMediaSource) {
        video.disableRemotePlayback = true;
        video.srcObject = mediaSource as unknown as MediaProvider;
      } else {
        video.srcObject = null;
        video.src = objectUrl as string;
      }
      void video.play().catch(() => undefined);

      mediaSource.addEventListener(
        'sourceopen',
        () => {
          sourceOpen = true;
          requestMseStream();
        },
        { once: true }
      );
      socket.addEventListener('open', () => {
        socketOpen = true;
        requestMseStream();
      });
      socket.addEventListener('message', (event) => {
        if (!isActive()) {
          return;
        }
        if (event.data instanceof ArrayBuffer) {
          if (queuedBytes + event.data.byteLength > DIRECT_GO2RTC_MAX_QUEUED_BYTES) {
            failOnce();
            return;
          }
          queuedSegments.push(event.data);
          queuedBytes += event.data.byteLength;
          appendNextSegment();
          return;
        }

        const message = parseGo2RtcMessage(event);
        if (!message) {
          return;
        }
        if (message.type === 'error') {
          failOnce();
          return;
        }
        if (message.type !== 'mse' || sourceBuffer) {
          return;
        }

        try {
          if (!MediaSourceConstructor.isTypeSupported(message.value)) {
            failOnce();
            return;
          }
          sourceBuffer = mediaSource.addSourceBuffer(message.value);
          sourceBuffer.mode = 'segments';
          sourceBuffer.addEventListener('updateend', appendNextSegment);
          sourceBuffer.addEventListener('error', failOnce);
          appendNextSegment();
        } catch {
          failOnce();
        }
      });
      socket.addEventListener('error', failOnce);
      socket.addEventListener('close', failOnce);

      return {
        cleanup: () => {
          failed = true;
          if (startupTimeout !== null) {
            window.clearTimeout(startupTimeout);
          }
          socket.close();
          if (sourceBuffer && mediaSource.readyState === 'open') {
            try {
              mediaSource.removeSourceBuffer(sourceBuffer);
            } catch {
              // The media source may already be closing.
            }
          }
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        },
        hasVideoSource: () => true,
        markReady: () => {
          if (startupTimeout !== null) {
            window.clearTimeout(startupTimeout);
            startupTimeout = null;
          }
        },
        ownsVideoElement: () =>
          managedMediaSource
            ? video.srcObject === mediaSource
            : objectUrl !== null && video.src === objectUrl,
      };
    };

    const startDecodedFrameMonitor = (
      generation: number,
      attempt: DirectGo2RtcAttempt,
      fail: () => void
    ) => {
      let cleaned = false;
      let decodedFrameProgress = 0;
      let frameCallbackId: number | null = null;
      let hasDecodedFrame = false;
      let lastObservedFrameProgress: number | null = null;
      let stagnantDuration = 0;
      let fallbackListenersAttached = false;
      let useVideoFrameCallback = typeof video.requestVideoFrameCallback === 'function';
      const isActive = () => !cleaned && !cancelled && generation === playbackGeneration;

      const markDecodedFrameReady = (metadata?: VideoFrameCallbackMetadata) => {
        if (
          hasDecodedFrame ||
          !isActive() ||
          !attempt.ownsVideoElement() ||
          !attempt.hasVideoSource() ||
          !hasDecodedVideoDimensions(video, metadata)
        ) {
          return;
        }
        hasDecodedFrame = true;
        attempt.markReady();
        markReadyRef.current();
      };

      const observeDecodedFrameCounter = () => {
        if (
          !isActive() ||
          !attempt.ownsVideoElement() ||
          !attempt.hasVideoSource() ||
          !hasDecodedVideoDimensions(video)
        ) {
          return;
        }
        const decodedFrameCount = getDecodedVideoFrameCount(video);
        if (decodedFrameCount !== null) {
          if (decodedFrameCount <= 0) {
            return;
          }
          decodedFrameProgress = decodedFrameCount;
        }
        markDecodedFrameReady();
      };

      const attachFallbackListeners = () => {
        if (fallbackListenersAttached) {
          return;
        }
        fallbackListenersAttached = true;
        video.addEventListener('canplay', observeDecodedFrameCounter);
        video.addEventListener('loadeddata', observeDecodedFrameCounter);
        video.addEventListener('playing', observeDecodedFrameCounter);
      };

      const scheduleDecodedFrameCallback = () => {
        if (!useVideoFrameCallback || !isActive() || frameCallbackId !== null) {
          return;
        }
        try {
          frameCallbackId = video.requestVideoFrameCallback((_now, metadata) => {
            frameCallbackId = null;
            if (!isActive()) {
              return;
            }
            if (
              attempt.ownsVideoElement() &&
              attempt.hasVideoSource() &&
              hasDecodedVideoDimensions(video, metadata)
            ) {
              decodedFrameProgress += 1;
              markDecodedFrameReady(metadata);
            }
            const decodedFrameCount = getDecodedVideoFrameCount(video);
            if (hasDecodedFrame && decodedFrameCount !== null && decodedFrameCount > 0) {
              decodedFrameProgress = decodedFrameCount;
              useVideoFrameCallback = false;
              return;
            }
            scheduleDecodedFrameCallback();
          });
        } catch {
          useVideoFrameCallback = false;
          attachFallbackListeners();
        }
      };

      if (useVideoFrameCallback) {
        scheduleDecodedFrameCallback();
      } else {
        attachFallbackListeners();
      }

      const stallCleanup = subscribeVisibilityAwareTask(() => {
        if (
          document.hidden ||
          !isActive() ||
          !attempt.ownsVideoElement() ||
          !attempt.hasVideoSource()
        ) {
          lastObservedFrameProgress = null;
          stagnantDuration = 0;
          return;
        }

        if (!useVideoFrameCallback) {
          observeDecodedFrameCounter();
        }
        if (!hasDecodedFrame) {
          lastObservedFrameProgress = null;
          stagnantDuration = 0;
          return;
        }

        const currentFrameProgress = useVideoFrameCallback
          ? decodedFrameProgress
          : getDecodedVideoFrameCount(video);
        if (currentFrameProgress === null) {
          lastObservedFrameProgress = null;
          stagnantDuration = 0;
          return;
        }
        if (
          lastObservedFrameProgress === null ||
          currentFrameProgress > lastObservedFrameProgress
        ) {
          lastObservedFrameProgress = currentFrameProgress;
          stagnantDuration = 0;
          return;
        }

        stagnantDuration += DIRECT_GO2RTC_STALL_CHECK_INTERVAL_MS;
        if (stagnantDuration >= DIRECT_GO2RTC_STALL_THRESHOLD_MS) {
          fail();
        }
      }, DIRECT_GO2RTC_STALL_CHECK_INTERVAL_MS);

      return () => {
        cleaned = true;
        stallCleanup();
        if (frameCallbackId !== null && typeof video.cancelVideoFrameCallback === 'function') {
          video.cancelVideoFrameCallback(frameCallbackId);
        }
        frameCallbackId = null;
        if (fallbackListenersAttached) {
          video.removeEventListener('canplay', observeDecodedFrameCounter);
          video.removeEventListener('loadeddata', observeDecodedFrameCounter);
          video.removeEventListener('playing', observeDecodedFrameCounter);
        }
      };
    };

    const startAttempt = (index: number, deferUntilResetSettles = false) => {
      clearPendingAttemptStart();
      activeAttemptCleanup?.();
      activeAttemptCleanup = null;
      playbackGeneration += 1;
      const generation = playbackGeneration;
      hasLoadedFrameRef.current = false;
      setHasLoadedFrame(false);
      resetVideo();

      let failureScheduled = false;
      const advanceOrFail = () => {
        if (failureScheduled || cancelled || generation !== playbackGeneration) {
          return;
        }
        failureScheduled = true;
        window.queueMicrotask(() => {
          if (cancelled || generation !== playbackGeneration) {
            return;
          }
          const nextIndex = index + 1;
          if (nextIndex < attemptModes.length) {
            startAttempt(nextIndex, true);
            return;
          }

          playbackGeneration += 1;
          activeAttemptCleanup?.();
          activeAttemptCleanup = null;
          hasLoadedFrameRef.current = false;
          setHasLoadedFrame(false);
          resetVideo();
          onError();
        });
      };

      const beginAttempt = () => {
        pendingAttemptStart = null;
        if (cancelled || generation !== playbackGeneration) {
          return;
        }
        const attemptMode = attemptModes[index];
        if (
          (attemptMode === 'web_rtc' && typeof RTCPeerConnection === 'undefined') ||
          (attemptMode === 'mse' &&
            typeof MediaSource === 'undefined' &&
            typeof (
              window as typeof window & {
                ManagedMediaSource?: typeof MediaSource;
              }
            ).ManagedMediaSource === 'undefined')
        ) {
          advanceOrFail();
          return;
        }

        try {
          const attempt =
            attemptMode === 'mse'
              ? startMseAttempt(generation, advanceOrFail)
              : startWebRtcAttempt(generation, advanceOrFail);
          const monitorCleanup = startDecodedFrameMonitor(generation, attempt, advanceOrFail);
          activeAttemptCleanup = () => {
            monitorCleanup();
            attempt.cleanup();
          };
        } catch {
          advanceOrFail();
        }
      };

      if (deferUntilResetSettles) {
        pendingAttemptStart = window.setTimeout(beginAttempt, 0);
      } else {
        beginAttempt();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearPendingAttemptStart();
        playbackGeneration += 1;
        activeAttemptCleanup?.();
        activeAttemptCleanup = null;
        hasLoadedFrameRef.current = false;
        setHasLoadedFrame(false);
        resetVideo();
      } else {
        startAttempt(0);
      }
    };

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.removeAttribute('poster');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (!document.hidden) {
      startAttempt(0);
    }

    return () => {
      cancelled = true;
      playbackGeneration += 1;
      clearPendingAttemptStart();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activeAttemptCleanup?.();
      resetVideo();
    };
  }, [endpoint, onError]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {!hasLoadedFrame ? (
        <CameraStreamLoadingIndicator
          label={loadingLabel}
          posterUrl={posterUrl}
          fitMode={fitMode}
        />
      ) : null}
      <video
        ref={videoRef}
        aria-label={title}
        autoPlay
        className={`h-full w-full ${videoFitClassNames[fitMode]}`}
        muted
        playsInline
        style={{ opacity: hasLoadedFrame ? 1 : 0 }}
      />
    </div>
  );
}
