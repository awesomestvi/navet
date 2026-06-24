import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { resolveCameraStreamResource } from '@navet/app/services/integration-camera-runtime.service';
import { memo, type RefObject, useEffect, useRef, useState } from 'react';
import type { CameraImageSourceKind } from './camera-view-mode';

interface CameraStreamPlayerProps {
  entityId: string;
  kind: Exclude<CameraImageSourceKind, 'snapshot'>;
  posterUrl: string | undefined;
  streamResource?: ResolvedPlatformResource | null;
  fitMode: 'cover' | 'contain';
  onLoad?: () => void;
  onError: (kind: CameraImageSourceKind, options?: CameraStreamErrorOptions) => void;
}

const CAMERA_STREAM_LOAD_TIMEOUT_MS = 10_000;
const CAMERA_WEBRTC_STREAM_LOAD_TIMEOUT_MS = 15_000;
const CAMERA_HLS_STREAM_LOAD_TIMEOUT_MS = 20_000;
const CAMERA_STREAM_STALL_CHECK_INTERVAL_MS = 2_000;
const CAMERA_STREAM_STALL_THRESHOLD_MS = 6_000;
const MJPEG_STREAM_RECONNECT_INTERVAL_MS = 30_000;
const CAMERA_HLS_MEDIA_ERROR_RECOVERY_LIMIT = 1;
const CAMERA_HLS_NETWORK_ERROR_RECOVERY_LIMIT = 1;
const CAMERA_HLS_FRESH_URL_RETRY_LIMIT = 1;

const videoFitClassNames = {
  contain: 'object-contain',
  cover: 'object-cover',
} as const;

interface CameraStreamErrorOptions {
  retryable?: boolean;
}

function CameraStreamLoadingIndicator() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/24">
      <div
        role="status"
        aria-label="Loading camera feed"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/55 backdrop-blur-md"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/28 border-t-white" />
      </div>
    </div>
  );
}

function isHomeAssistantCameraStreamUnsupportedError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'start_stream_failed' &&
    typeof message === 'string' &&
    message.includes('does not support play stream service')
  );
}

function applyVideoBaseAttributes(video: HTMLVideoElement, posterUrl: string | undefined) {
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  if (posterUrl) {
    video.poster = posterUrl;
  } else {
    video.removeAttribute('poster');
  }
}

function shouldUseNativeHlsPlayback(video: HTMLVideoElement) {
  const vendor = navigator.vendor?.toLowerCase() ?? '';
  const userAgent = navigator.userAgent.toLowerCase();
  const isAppleWebKit =
    vendor.includes('apple') &&
    !userAgent.includes('crios') &&
    !userAgent.includes('fxios') &&
    !userAgent.includes('edgios');

  return isAppleWebKit && Boolean(video.canPlayType('application/vnd.apple.mpegurl'));
}

function clearStreamLoadTimeout(timeoutRef: React.MutableRefObject<number | null>) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

function hasCurrentMediaData(video: HTMLVideoElement | null) {
  return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
}

function scheduleStreamLoadTimeout(
  timeoutRef: React.MutableRefObject<number | null>,
  kind: CameraImageSourceKind,
  onError: CameraStreamPlayerProps['onError'],
  delayMs = CAMERA_STREAM_LOAD_TIMEOUT_MS
) {
  clearStreamLoadTimeout(timeoutRef);
  timeoutRef.current = window.setTimeout(() => {
    timeoutRef.current = null;
    onError(kind);
  }, delayMs);
}

function clearStreamStallWatchdog(
  intervalRef: React.MutableRefObject<number | null>,
  stagnantDurationRef: React.MutableRefObject<number>,
  lastObservedTimeRef: React.MutableRefObject<number | null>
) {
  if (intervalRef.current !== null) {
    window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  stagnantDurationRef.current = 0;
  lastObservedTimeRef.current = null;
}

function scheduleStreamStallWatchdog(
  intervalRef: React.MutableRefObject<number | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  kind: CameraImageSourceKind,
  hasLoadedFrameRef: React.MutableRefObject<boolean>,
  stagnantDurationRef: React.MutableRefObject<number>,
  lastObservedTimeRef: React.MutableRefObject<number | null>,
  onError: CameraStreamPlayerProps['onError']
) {
  clearStreamStallWatchdog(intervalRef, stagnantDurationRef, lastObservedTimeRef);
  intervalRef.current = window.setInterval(() => {
    const video = videoRef.current;
    if (!video || !hasLoadedFrameRef.current || document.hidden) {
      return;
    }

    if (video.paused || video.ended || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      stagnantDurationRef.current = 0;
      lastObservedTimeRef.current = null;
      return;
    }

    const currentTime = video.currentTime;
    if (!Number.isFinite(currentTime)) {
      return;
    }

    const lastObservedTime = lastObservedTimeRef.current;
    if (lastObservedTime === null || currentTime > lastObservedTime + 0.01) {
      lastObservedTimeRef.current = currentTime;
      stagnantDurationRef.current = 0;
      return;
    }

    stagnantDurationRef.current += CAMERA_STREAM_STALL_CHECK_INTERVAL_MS;
    if (stagnantDurationRef.current >= CAMERA_STREAM_STALL_THRESHOLD_MS) {
      clearStreamStallWatchdog(intervalRef, stagnantDurationRef, lastObservedTimeRef);
      onError(kind);
    }
  }, CAMERA_STREAM_STALL_CHECK_INTERVAL_MS);
}

function getStreamResourceKey(resource: ResolvedPlatformResource | null | undefined) {
  if (!resource) {
    return '';
  }

  return `${resource.kind}:${resource.url ?? ''}:${resource.cacheKey}`;
}

function appendReloadToken(url: string, reloadKey: number) {
  if (url.includes('authSig=')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_mjpeg_t=${reloadKey}`;
}

function MjpegCameraPlayer({
  posterUrl: _posterUrl,
  streamResource,
  fitMode,
  onLoad,
}: Omit<CameraStreamPlayerProps, 'entityId' | 'kind'>) {
  const streamResourceUrl =
    streamResource?.kind === 'mjpeg_stream' ? streamResource.url : undefined;
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!streamResourceUrl) {
      return;
    }

    const interval = window.setInterval(() => {
      setReloadKey((current) => current + 1);
    }, MJPEG_STREAM_RECONNECT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [streamResourceUrl]);

  useEffect(() => {
    setHasLoadedFrame(false);
  }, [streamResourceUrl]);

  const reloadingStreamUrl =
    streamResourceUrl && reloadKey > 0
      ? appendReloadToken(streamResourceUrl, reloadKey)
      : streamResourceUrl;

  return (
    <div className="relative h-full w-full">
      {reloadingStreamUrl && !hasLoadedFrame && reloadKey === 0 ? (
        <CameraStreamLoadingIndicator />
      ) : null}
      {reloadingStreamUrl ? (
        <img
          key={reloadKey}
          src={reloadingStreamUrl}
          alt=""
          aria-hidden="true"
          className={`h-full w-full ${videoFitClassNames[fitMode]}`}
          onLoad={() => {
            setHasLoadedFrame(true);
            onLoad?.();
          }}
          onError={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function HlsCameraPlayer({
  entityId,
  posterUrl,
  streamResource,
  fitMode,
  onLoad,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind'>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const stallIntervalRef = useRef<number | null>(null);
  const stagnantDurationRef = useRef(0);
  const lastObservedTimeRef = useRef<number | null>(null);
  const hasLoadedFrameRef = useRef(false);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const streamResourceUrl = streamResource?.kind === 'hls_stream' ? streamResource.url : undefined;
  const freshUrlRetryCountRef = useRef(0);

  const markStreamReady = () => {
    if (hasLoadedFrameRef.current) {
      return;
    }

    hasLoadedFrameRef.current = true;
    stagnantDurationRef.current = 0;
    lastObservedTimeRef.current = videoRef.current?.currentTime ?? null;
    setHasLoadedFrame(true);
    clearStreamLoadTimeout(loadTimeoutRef);
    scheduleStreamStallWatchdog(
      stallIntervalRef,
      videoRef,
      'hls',
      hasLoadedFrameRef,
      stagnantDurationRef,
      lastObservedTimeRef,
      onError
    );
    onLoad?.();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    applyVideoBaseAttributes(video, posterUrl);
  }, [posterUrl]);

  useEffect(() => {
    let cancelled = false;
    let cleanupHls: (() => void) | undefined;
    let mediaErrorRecoveryAttempts = 0;
    let networkErrorRecoveryAttempts = 0;
    let activeStreamUrl = streamResourceUrl;

    const cleanUp = () => {
      cleanupHls?.();
      cleanupHls = undefined;
      const video = videoRef.current;
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
      clearStreamLoadTimeout(loadTimeoutRef);
      clearStreamStallWatchdog(stallIntervalRef, stagnantDurationRef, lastObservedTimeRef);
      hasLoadedFrameRef.current = false;
    };

    const loadStreamUrl = async (preferFreshUrl: boolean) => {
      if (!preferFreshUrl && activeStreamUrl) {
        return activeStreamUrl;
      }

      const stream = await integrationCameraFeatureService.getCameraStreamUrl(entityId, 'hls');
      if (cancelled) {
        return undefined;
      }

      activeStreamUrl =
        (await resolveCameraStreamResource(entityId, 'hls', stream.url)).url ?? stream.url;
      return activeStreamUrl;
    };

    const handleTerminalFailure = async ({
      retryable = true,
      allowFreshUrlRetry = false,
    }: {
      retryable?: boolean;
      allowFreshUrlRetry?: boolean;
    } = {}) => {
      if (
        allowFreshUrlRetry &&
        retryable &&
        !cancelled &&
        !hasLoadedFrameRef.current &&
        freshUrlRetryCountRef.current < CAMERA_HLS_FRESH_URL_RETRY_LIMIT
      ) {
        freshUrlRetryCountRef.current += 1;
        try {
          const refreshedUrl = await loadStreamUrl(true);
          if (!refreshedUrl || cancelled) {
            return;
          }

          void start(true);
          return;
        } catch (error) {
          if (!cancelled) {
            clearStreamLoadTimeout(loadTimeoutRef);
            onError('hls', {
              retryable: retryable && !isHomeAssistantCameraStreamUnsupportedError(error),
            });
          }
          return;
        }
      }

      if (!cancelled) {
        clearStreamLoadTimeout(loadTimeoutRef);
        if (retryable) {
          onError('hls');
        } else {
          onError('hls', { retryable: false });
        }
      }
    };

    const refreshStartupTimeout = () => {
      if (hasLoadedFrameRef.current) {
        return;
      }

      clearStreamLoadTimeout(loadTimeoutRef);
      loadTimeoutRef.current = window.setTimeout(() => {
        loadTimeoutRef.current = null;
        void handleTerminalFailure({
          retryable: true,
          allowFreshUrlRetry: true,
        });
      }, CAMERA_HLS_STREAM_LOAD_TIMEOUT_MS);
    };

    const start = async (preferFreshUrl = false) => {
      cleanUp();
      if (document.hidden) {
        return;
      }

      const video = videoRef.current;
      if (!video) {
        return;
      }

      setHasLoadedFrame(false);
      hasLoadedFrameRef.current = false;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      mediaErrorRecoveryAttempts = 0;
      networkErrorRecoveryAttempts = 0;
      refreshStartupTimeout();

      try {
        const playableStreamUrl = await loadStreamUrl(preferFreshUrl);

        if (!playableStreamUrl || cancelled) {
          return;
        }

        if (shouldUseNativeHlsPlayback(video)) {
          video.src = playableStreamUrl;
          await video.play().catch(() => undefined);
          if (hasCurrentMediaData(video)) {
            markStreamReady();
          }
          return;
        }

        const Hls = (await import('hls.js')).default;
        if (cancelled) {
          return;
        }

        if (!Hls.isSupported()) {
          onError('hls', { retryable: false });
          return;
        }

        const hls = new Hls({
          backBufferLength: 60,
          fragLoadingTimeOut: 30_000,
          manifestLoadingTimeOut: 30_000,
          levelLoadingTimeOut: 30_000,
          lowLatencyMode: true,
          maxLiveSyncPlaybackRate: 2,
        });
        cleanupHls = () => hls.destroy();
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(playableStreamUrl));
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          refreshStartupTimeout();
          void video.play().catch(() => undefined);
          if (hasCurrentMediaData(video)) {
            markStreamReady();
          }
        });
        hls.on(Hls.Events.LEVEL_LOADED, () => {
          refreshStartupTimeout();
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          refreshStartupTimeout();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            if (!hasLoadedFrameRef.current) {
              refreshStartupTimeout();
            }
            return;
          }

          if (data.type === Hls.ErrorTypes?.MEDIA_ERROR) {
            if (mediaErrorRecoveryAttempts < CAMERA_HLS_MEDIA_ERROR_RECOVERY_LIMIT) {
              mediaErrorRecoveryAttempts += 1;
              refreshStartupTimeout();
              hls.recoverMediaError();
              return;
            }
          } else if (data.type === Hls.ErrorTypes?.NETWORK_ERROR) {
            if (networkErrorRecoveryAttempts < CAMERA_HLS_NETWORK_ERROR_RECOVERY_LIMIT) {
              networkErrorRecoveryAttempts += 1;
              refreshStartupTimeout();
              hls.startLoad();
              return;
            }
          }

          void handleTerminalFailure();
        });
      } catch (error) {
        if (!cancelled) {
          void handleTerminalFailure({
            retryable: !isHomeAssistantCameraStreamUnsupportedError(error),
            allowFreshUrlRetry: true,
          });
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      cleanUp();
    };
  }, [entityId, onError, streamResourceUrl]);

  return (
    <div className="relative h-full w-full">
      {!hasLoadedFrame ? <CameraStreamLoadingIndicator /> : null}
      <video
        ref={videoRef}
        autoPlay
        className={`h-full w-full transition-opacity ${videoFitClassNames[fitMode]} ${
          hasLoadedFrame ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        onCanPlay={markStreamReady}
        onLoadedData={markStreamReady}
        onError={() => onError('hls')}
        onPlaying={markStreamReady}
        playsInline
      />
    </div>
  );
}

function WebRtcCameraPlayer({
  entityId,
  posterUrl,
  streamResource: _streamResource,
  fitMode,
  onLoad,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind'>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const stallIntervalRef = useRef<number | null>(null);
  const stagnantDurationRef = useRef(0);
  const lastObservedTimeRef = useRef<number | null>(null);
  const hasLoadedFrameRef = useRef(false);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);

  const markStreamReady = () => {
    if (hasLoadedFrameRef.current) {
      return;
    }

    hasLoadedFrameRef.current = true;
    stagnantDurationRef.current = 0;
    lastObservedTimeRef.current = videoRef.current?.currentTime ?? null;
    setHasLoadedFrame(true);
    clearStreamLoadTimeout(loadTimeoutRef);
    onLoad?.();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    applyVideoBaseAttributes(video, posterUrl);
  }, [posterUrl]);

  useEffect(() => {
    let cancelled = false;
    let peerConnection: RTCPeerConnection | undefined;
    let remoteStream: MediaStream | undefined;
    let unsubscribePromise: Promise<() => void> | undefined;
    let sessionId: string | undefined;
    const pendingCandidates: RTCIceCandidate[] = [];
    const pendingRemoteCandidates: RTCIceCandidateInit[] = [];
    let remoteDescriptionReady = false;

    const cleanUp = () => {
      remoteStream?.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStream = undefined;
      peerConnection?.close();
      peerConnection = undefined;
      void unsubscribePromise?.then((unsubscribe) => unsubscribe());
      unsubscribePromise = undefined;
      const closeSession = integrationCameraFeatureService.closeCameraWebRtcSession;
      if (closeSession && sessionId) {
        void closeSession(entityId, sessionId).catch(() => undefined);
      }
      sessionId = undefined;
      pendingCandidates.length = 0;
      pendingRemoteCandidates.length = 0;
      remoteDescriptionReady = false;

      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
        video.removeAttribute('src');
        video.load();
      }
      clearStreamLoadTimeout(loadTimeoutRef);
      clearStreamStallWatchdog(stallIntervalRef, stagnantDurationRef, lastObservedTimeRef);
      hasLoadedFrameRef.current = false;
    };

    const sendPendingCandidates = () => {
      if (!sessionId) {
        return;
      }

      for (const candidate of pendingCandidates.splice(0)) {
        void integrationCameraFeatureService.addCameraWebRtcCandidate(
          entityId,
          sessionId,
          candidate.toJSON()
        );
      }
    };

    const flushPendingRemoteCandidates = async () => {
      if (!peerConnection || !remoteDescriptionReady) {
        return;
      }

      for (const candidate of pendingRemoteCandidates.splice(0)) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const refreshStartupTimeout = () => {
      if (hasLoadedFrameRef.current) {
        return;
      }

      scheduleStreamLoadTimeout(
        loadTimeoutRef,
        'web_rtc',
        onError,
        CAMERA_WEBRTC_STREAM_LOAD_TIMEOUT_MS
      );
    };

    const start = async () => {
      cleanUp();
      if (document.hidden) {
        return;
      }

      const video = videoRef.current;
      if (!video || typeof RTCPeerConnection === 'undefined') {
        onError('web_rtc');
        return;
      }

      setHasLoadedFrame(false);
      hasLoadedFrameRef.current = false;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      refreshStartupTimeout();

      try {
        const clientConfig =
          await integrationCameraFeatureService.getWebRtcClientConfiguration(entityId);
        if (cancelled) {
          return;
        }
        refreshStartupTimeout();

        peerConnection = new RTCPeerConnection(clientConfig.configuration);
        if (clientConfig.dataChannel) {
          peerConnection.createDataChannel(clientConfig.dataChannel);
        }

        remoteStream = new MediaStream();
        peerConnection.ontrack = (event) => {
          if (!remoteStream || !videoRef.current) {
            return;
          }
          refreshStartupTimeout();
          remoteStream.addTrack(event.track);
          videoRef.current.srcObject = remoteStream;
          void videoRef.current.play().catch(() => undefined);
        };
        peerConnection.onicecandidate = (event) => {
          if (!event.candidate?.candidate) {
            return;
          }
          if (!sessionId) {
            pendingCandidates.push(event.candidate);
            return;
          }
          void integrationCameraFeatureService.addCameraWebRtcCandidate(
            entityId,
            sessionId,
            event.candidate.toJSON()
          );
        };
        peerConnection.oniceconnectionstatechange = () => {
          if (
            peerConnection?.iceConnectionState === 'checking' ||
            peerConnection?.iceConnectionState === 'connected' ||
            peerConnection?.iceConnectionState === 'completed'
          ) {
            refreshStartupTimeout();
          }
          if (peerConnection?.iceConnectionState === 'failed') {
            peerConnection.restartIce();
          }
        };

        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
        peerConnection.addTransceiver('video', { direction: 'recvonly' });

        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection.setLocalDescription(offer);
        refreshStartupTimeout();
        if (!offer.sdp || cancelled) {
          return;
        }

        unsubscribePromise = integrationCameraFeatureService.subscribeCameraWebRtcOffer(
          entityId,
          offer.sdp,
          (event) => {
            if (cancelled || !peerConnection) {
              return;
            }
            if (event.type === 'session') {
              sessionId = event.session_id;
              refreshStartupTimeout();
              sendPendingCandidates();
              return;
            }
            if (event.type === 'answer') {
              void peerConnection
                .setRemoteDescription(
                  new RTCSessionDescription({ type: 'answer', sdp: event.answer })
                )
                .then(async () => {
                  remoteDescriptionReady = true;
                  refreshStartupTimeout();
                  await flushPendingRemoteCandidates();
                })
                .catch(() => {
                  onError('web_rtc');
                });
              return;
            }
            if (event.type === 'candidate') {
              if (!remoteDescriptionReady) {
                pendingRemoteCandidates.push(event.candidate);
                return;
              }
              refreshStartupTimeout();
              void peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
              return;
            }
            onError('web_rtc');
          }
        );
      } catch {
        if (!cancelled) {
          clearStreamLoadTimeout(loadTimeoutRef);
          onError('web_rtc');
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      cleanUp();
    };
  }, [entityId, onError]);

  return (
    <div className="relative h-full w-full">
      {!hasLoadedFrame ? <CameraStreamLoadingIndicator /> : null}
      <video
        ref={videoRef}
        autoPlay
        className={`h-full w-full transition-opacity ${videoFitClassNames[fitMode]} ${
          hasLoadedFrame ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        onCanPlay={markStreamReady}
        onError={() => onError('web_rtc')}
        onLoadedData={markStreamReady}
        onPlaying={markStreamReady}
        playsInline
      />
    </div>
  );
}

export const CameraStreamPlayer = memo(function CameraStreamPlayer(props: CameraStreamPlayerProps) {
  if (props.kind === 'hls') {
    return <HlsCameraPlayer {...props} />;
  }

  if (props.kind === 'mjpeg') {
    return <MjpegCameraPlayer {...props} />;
  }

  return <WebRtcCameraPlayer {...props} />;
}, areCameraStreamPlayerPropsEqual);

function areCameraStreamPlayerPropsEqual(
  previous: CameraStreamPlayerProps,
  next: CameraStreamPlayerProps
) {
  return (
    previous.entityId === next.entityId &&
    previous.kind === next.kind &&
    previous.fitMode === next.fitMode &&
    previous.onLoad === next.onLoad &&
    previous.onError === next.onError &&
    getStreamResourceKey(previous.streamResource) === getStreamResourceKey(next.streamResource) &&
    (previous.kind === 'web_rtc' || previous.posterUrl === next.posterUrl)
  );
}
