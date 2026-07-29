import { defaultTranslate } from '@navet/app/i18n';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { resolveCameraStreamResource } from '@navet/app/services/integration-camera-runtime.service';
import { subscribeVisibilityAwareTask } from '@navet/app/utils/visibility-aware-scheduler';
import { memo, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { CameraStreamLoadingIndicator } from './camera-stream-loading-indicator';
import type { CameraImageSourceKind } from './camera-view-mode';
import { DirectGo2RtcCameraPlayer } from './direct-go2rtc-camera-player';
import { getGo2RtcViewerPresentation } from './go2rtc-viewer-presentation';

interface CameraStreamPlayerProps {
  entityId: string;
  kind: Exclude<CameraImageSourceKind, 'snapshot'>;
  posterUrl: string | undefined;
  streamResource?: ResolvedPlatformResource | null;
  fitMode: 'cover' | 'contain';
  onLoad?: () => void;
  onError: (kind: CameraImageSourceKind, options?: CameraStreamErrorOptions) => void;
  loadingLabel?: string;
  webRtcTitle?: string;
}

const CAMERA_WEBRTC_STREAM_LOAD_TIMEOUT_MS = 15_000;
const CAMERA_HLS_STREAM_LOAD_TIMEOUT_MS = 20_000;
const CAMERA_STREAM_STALL_CHECK_INTERVAL_MS = 2_000;
const CAMERA_STREAM_STALL_THRESHOLD_MS = 6_000;
const MJPEG_STREAM_RECONNECT_INTERVAL_MS = 30_000;
const CAMERA_MJPEG_ERROR_RETRY_LIMIT = 1;
const CAMERA_HLS_MEDIA_ERROR_RECOVERY_LIMIT = 1;
const CAMERA_HLS_NETWORK_ERROR_RECOVERY_LIMIT = 1;
const CAMERA_HLS_FRESH_URL_RETRY_LIMIT = 1;
const CAMERA_WEBRTC_DISCONNECTED_GRACE_MS = 3_000;

const videoFitClassNames = {
  contain: 'object-contain',
  cover: 'object-cover',
} as const;

const CAMERA_MEDIA_SURFACE_CLASS_NAME = 'h-full w-full';

interface CameraStreamErrorOptions {
  retryable?: boolean;
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

function clearStreamStallWatchdog(
  cleanupRef: React.MutableRefObject<(() => void) | null>,
  stagnantDurationRef: React.MutableRefObject<number>,
  lastObservedTimeRef: React.MutableRefObject<number | null>
) {
  cleanupRef.current?.();
  cleanupRef.current = null;
  stagnantDurationRef.current = 0;
  lastObservedTimeRef.current = null;
}

function scheduleStreamStallWatchdog(
  cleanupRef: React.MutableRefObject<(() => void) | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  kind: CameraImageSourceKind,
  hasLoadedFrameRef: React.MutableRefObject<boolean>,
  stagnantDurationRef: React.MutableRefObject<number>,
  lastObservedTimeRef: React.MutableRefObject<number | null>,
  onError: CameraStreamPlayerProps['onError']
) {
  clearStreamStallWatchdog(cleanupRef, stagnantDurationRef, lastObservedTimeRef);
  cleanupRef.current = subscribeVisibilityAwareTask(() => {
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
      clearStreamStallWatchdog(cleanupRef, stagnantDurationRef, lastObservedTimeRef);
      onError(kind);
    }
  }, CAMERA_STREAM_STALL_CHECK_INTERVAL_MS);
}

function getDecodedVideoFrameCount(video: HTMLVideoElement) {
  const playbackQuality = video.getVideoPlaybackQuality?.();
  const playbackQualityFrameCount =
    playbackQuality &&
    Number.isFinite(playbackQuality.totalVideoFrames) &&
    playbackQuality.totalVideoFrames >= 0
      ? playbackQuality.totalVideoFrames
      : null;
  const legacyFrameCount = (
    video as HTMLVideoElement & {
      webkitDecodedFrameCount?: number;
    }
  ).webkitDecodedFrameCount;
  const normalizedLegacyFrameCount =
    typeof legacyFrameCount === 'number' &&
    Number.isFinite(legacyFrameCount) &&
    legacyFrameCount >= 0
      ? legacyFrameCount
      : null;

  if (playbackQualityFrameCount === null) {
    return normalizedLegacyFrameCount;
  }
  if (normalizedLegacyFrameCount === null) {
    return playbackQualityFrameCount;
  }
  return Math.max(playbackQualityFrameCount, normalizedLegacyFrameCount);
}

function hasDecodedVideoDimensions(video: HTMLVideoElement, metadata?: VideoFrameCallbackMetadata) {
  const width = metadata?.width ?? video.videoWidth;
  const height = metadata?.height ?? video.videoHeight;
  return width > 0 && height > 0;
}

function subscribeDecodedVideoFrameMonitor(options: {
  video: HTMLVideoElement;
  isActive: () => boolean;
  ownsVideoElement: () => boolean;
  hasVideoSource: () => boolean;
  onReady: () => void;
  onError: () => void;
}) {
  const { video, isActive, ownsVideoElement, hasVideoSource, onReady, onError } = options;
  let cleaned = false;
  let decodedFrameProgress = 0;
  let fallbackListenersAttached = false;
  let frameCallbackId: number | null = null;
  let hasDecodedFrame = false;
  let lastObservedFrameProgress: number | null = null;
  let stagnantDuration = 0;
  let useVideoFrameCallback = typeof video.requestVideoFrameCallback === 'function';
  const isMonitorActive = () => !cleaned && isActive();

  const reportFailure = () => {
    if (!isMonitorActive()) {
      return;
    }
    onError();
  };
  const reportMediaFailure = () => {
    if (!isMonitorActive() || !ownsVideoElement() || !hasVideoSource()) {
      return;
    }
    reportFailure();
  };

  const markDecodedFrameReady = (metadata?: VideoFrameCallbackMetadata) => {
    if (
      hasDecodedFrame ||
      !isMonitorActive() ||
      !ownsVideoElement() ||
      !hasVideoSource() ||
      !hasDecodedVideoDimensions(video, metadata)
    ) {
      return;
    }
    hasDecodedFrame = true;
    onReady();
  };

  const observeDecodedFrameCounter = () => {
    if (
      !isMonitorActive() ||
      !ownsVideoElement() ||
      !hasVideoSource() ||
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
    if (!useVideoFrameCallback || !isMonitorActive() || frameCallbackId !== null) {
      return;
    }
    try {
      frameCallbackId = video.requestVideoFrameCallback((_now, metadata) => {
        frameCallbackId = null;
        if (!isMonitorActive()) {
          return;
        }
        if (ownsVideoElement() && hasVideoSource() && hasDecodedVideoDimensions(video, metadata)) {
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
  video.addEventListener('error', reportMediaFailure);

  const stallCleanup = subscribeVisibilityAwareTask(() => {
    if (document.hidden || !isMonitorActive() || !ownsVideoElement() || !hasVideoSource()) {
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
    if (lastObservedFrameProgress === null || currentFrameProgress > lastObservedFrameProgress) {
      lastObservedFrameProgress = currentFrameProgress;
      stagnantDuration = 0;
      return;
    }

    stagnantDuration += CAMERA_STREAM_STALL_CHECK_INTERVAL_MS;
    if (stagnantDuration >= CAMERA_STREAM_STALL_THRESHOLD_MS) {
      reportFailure();
    }
  }, CAMERA_STREAM_STALL_CHECK_INTERVAL_MS);

  return () => {
    cleaned = true;
    stallCleanup();
    video.removeEventListener('error', reportMediaFailure);
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
}

function getStreamResourceKey(resource: ResolvedPlatformResource | null | undefined) {
  if (!resource) {
    return '';
  }

  return `${resource.kind}:${resource.url ?? ''}:${resource.cacheKey}:${resource.metadata?.mode ?? ''}`;
}

function appendReloadToken(url: string, reloadKey: number) {
  if (url.includes('authSig=')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_mjpeg_t=${reloadKey}`;
}

function normalizeRemoteIceCandidate(candidate: RTCIceCandidateInit): RTCIceCandidateInit {
  if (candidate.sdpMid == null && candidate.sdpMLineIndex == null) {
    return {
      ...candidate,
      sdpMid: '0',
    };
  }

  return candidate;
}

function MjpegCameraPlayer({
  posterUrl,
  streamResource,
  fitMode,
  onLoad,
  onError,
  loadingLabel = defaultTranslate('camera.loadingFeed'),
}: Omit<CameraStreamPlayerProps, 'entityId' | 'kind'>) {
  const streamResourceUrl =
    streamResource?.kind === 'mjpeg_stream' ? streamResource.url : undefined;
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const consecutiveErrorCountRef = useRef(0);

  useEffect(() => {
    if (!streamResourceUrl) {
      return;
    }

    return subscribeVisibilityAwareTask(() => {
      setReloadKey((current) => current + 1);
    }, MJPEG_STREAM_RECONNECT_INTERVAL_MS);
  }, [streamResourceUrl]);

  useEffect(() => {
    setHasLoadedFrame(false);
    consecutiveErrorCountRef.current = 0;
  }, [streamResourceUrl]);

  const reloadingStreamUrl =
    streamResourceUrl && reloadKey > 0
      ? appendReloadToken(streamResourceUrl, reloadKey)
      : streamResourceUrl;

  return (
    <div className="relative h-full w-full">
      {reloadingStreamUrl ? (
        <img
          key={reloadKey}
          src={reloadingStreamUrl}
          alt=""
          aria-hidden="true"
          className={`${CAMERA_MEDIA_SURFACE_CLASS_NAME} ${videoFitClassNames[fitMode]}`}
          onLoad={() => {
            consecutiveErrorCountRef.current = 0;
            setHasLoadedFrame(true);
            onLoad?.();
          }}
          onError={() => {
            setHasLoadedFrame(false);
            if (consecutiveErrorCountRef.current < CAMERA_MJPEG_ERROR_RETRY_LIMIT) {
              consecutiveErrorCountRef.current += 1;
              setReloadKey((current) => current + 1);
              return;
            }
            if (consecutiveErrorCountRef.current === CAMERA_MJPEG_ERROR_RETRY_LIMIT) {
              consecutiveErrorCountRef.current += 1;
              onError('mjpeg');
            }
          }}
        />
      ) : null}
      {reloadingStreamUrl && !hasLoadedFrame ? (
        <CameraStreamLoadingIndicator
          label={loadingLabel}
          posterUrl={posterUrl}
          fitMode={fitMode}
        />
      ) : null}
    </div>
  );
}

function HlsCameraPlayer({
  kind,
  entityId,
  posterUrl,
  streamResource,
  fitMode,
  onLoad,
  onError,
  loadingLabel = defaultTranslate('camera.loadingFeed'),
}: CameraStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const stallWatchdogCleanupRef = useRef<(() => void) | null>(null);
  const stagnantDurationRef = useRef(0);
  const lastObservedTimeRef = useRef<number | null>(null);
  const hasLoadedFrameRef = useRef(false);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const streamResourceUrl = streamResource?.kind === 'hls_stream' ? streamResource.url : undefined;
  const freshUrlRetryCountRef = useRef(0);
  const playbackKind = kind === 'mse' ? 'mse' : 'hls';

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
      stallWatchdogCleanupRef,
      videoRef,
      playbackKind,
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
    let playbackGeneration = 0;

    const cleanUp = () => {
      playbackGeneration += 1;
      cleanupHls?.();
      cleanupHls = undefined;
      const video = videoRef.current;
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
      clearStreamLoadTimeout(loadTimeoutRef);
      clearStreamStallWatchdog(stallWatchdogCleanupRef, stagnantDurationRef, lastObservedTimeRef);
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
            onError(playbackKind, {
              retryable: retryable && !isHomeAssistantCameraStreamUnsupportedError(error),
            });
          }
          return;
        }
      }

      if (!cancelled) {
        clearStreamLoadTimeout(loadTimeoutRef);
        if (retryable) {
          onError(playbackKind);
        } else {
          onError(playbackKind, { retryable: false });
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
      const activeGeneration = playbackGeneration;
      const isInactive = () =>
        cancelled || document.hidden || activeGeneration !== playbackGeneration;

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

        if (!playableStreamUrl || isInactive()) {
          return;
        }

        if (playbackKind !== 'mse' && shouldUseNativeHlsPlayback(video)) {
          video.src = playableStreamUrl;
          await video.play().catch(() => undefined);
          if (!isInactive() && hasCurrentMediaData(video)) {
            markStreamReady();
          }
          return;
        }

        const Hls = (await import('hls.js')).default;
        if (isInactive()) {
          return;
        }

        if (!Hls.isSupported()) {
          onError(playbackKind, { retryable: false });
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanUp();
        setHasLoadedFrame(false);
        return;
      }
      void start();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (!document.hidden) {
      void start();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanUp();
    };
  }, [entityId, onError, playbackKind, streamResourceUrl]);

  return (
    <div className="relative h-full w-full">
      {!hasLoadedFrame ? (
        <CameraStreamLoadingIndicator
          label={loadingLabel}
          posterUrl={posterUrl}
          fitMode={fitMode}
        />
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        className={`${CAMERA_MEDIA_SURFACE_CLASS_NAME} ${videoFitClassNames[fitMode]}`}
        muted
        onCanPlay={markStreamReady}
        onLoadedData={markStreamReady}
        onError={() => onError(playbackKind)}
        onPlaying={markStreamReady}
        playsInline
        style={{ opacity: hasLoadedFrame ? 1 : 0 }}
      />
    </div>
  );
}

function OpaqueGo2RtcCameraPlayer({
  url,
  posterUrl,
  fitMode,
  loadingLabel,
  title,
  onError,
}: {
  url: string;
  posterUrl: string | undefined;
  fitMode: CameraStreamPlayerProps['fitMode'];
  loadingLabel: string;
  title: string;
  onError: () => void;
}) {
  const [hasLoadedViewer, setHasLoadedViewer] = useState(false);

  useEffect(() => {
    setHasLoadedViewer(false);
  }, [url]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <iframe
        title={title}
        src={url}
        className={`${CAMERA_MEDIA_SURFACE_CLASS_NAME} border-0`}
        allow="autoplay; fullscreen; camera; microphone"
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
        onError={onError}
        onLoad={() => setHasLoadedViewer(true)}
      />
      {!hasLoadedViewer ? (
        <CameraStreamLoadingIndicator
          label={loadingLabel}
          posterUrl={posterUrl}
          fitMode={fitMode}
        />
      ) : null}
    </div>
  );
}

function WebRtcCameraPlayer({
  entityId,
  posterUrl,
  streamResource,
  fitMode,
  onLoad,
  onError,
  loadingLabel = defaultTranslate('camera.loadingFeed'),
  webRtcTitle = defaultTranslate('camera.webRtcStreamTitle'),
}: Omit<CameraStreamPlayerProps, 'kind'>) {
  const directStreamResource =
    streamResource?.kind === 'webrtc_stream' && streamResource.url ? streamResource : null;
  const streamResourceUrl = directStreamResource?.url;
  const directStreamPresentation = streamResourceUrl
    ? getGo2RtcViewerPresentation(streamResourceUrl, window.location.href)
    : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const hasLoadedFrameRef = useRef(false);
  const onLoadRef = useRef(onLoad);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const handleDirectStreamError = useCallback(() => onError('web_rtc'), [onError]);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (streamResourceUrl) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    applyVideoBaseAttributes(video, posterUrl);
  }, [posterUrl]);

  useEffect(() => {
    if (!streamResourceUrl) {
      return;
    }

    setHasLoadedFrame(false);
    hasLoadedFrameRef.current = false;
    clearStreamLoadTimeout(loadTimeoutRef);

    return () => {
      clearStreamLoadTimeout(loadTimeoutRef);
    };
  }, [onError, streamResourceUrl]);

  useEffect(() => {
    if (streamResourceUrl) {
      return;
    }

    let cancelled = false;
    let decodedFrameMonitorCleanup: (() => void) | undefined;
    let peerConnection: RTCPeerConnection | undefined;
    let remoteStream: MediaStream | undefined;
    let unsubscribePromise: Promise<() => void> | undefined;
    let sessionId: string | undefined;
    const pendingCandidates: RTCIceCandidate[] = [];
    const pendingRemoteCandidates: RTCIceCandidateInit[] = [];
    let remoteDescriptionReady = false;
    let webRtcSignalingErrorReported = false;
    let disconnectedTimeout: number | null = null;
    let playbackGeneration = 0;

    const reportWebRtcSignalingError = (expectedGeneration = playbackGeneration) => {
      if (cancelled || expectedGeneration !== playbackGeneration || webRtcSignalingErrorReported) {
        return;
      }

      webRtcSignalingErrorReported = true;
      clearStreamLoadTimeout(loadTimeoutRef);
      decodedFrameMonitorCleanup?.();
      decodedFrameMonitorCleanup = undefined;
      onError('web_rtc');
    };

    const cleanUp = () => {
      playbackGeneration += 1;
      decodedFrameMonitorCleanup?.();
      decodedFrameMonitorCleanup = undefined;
      if (disconnectedTimeout !== null) {
        window.clearTimeout(disconnectedTimeout);
        disconnectedTimeout = null;
      }
      remoteStream?.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStream = undefined;
      peerConnection?.close();
      peerConnection = undefined;
      void unsubscribePromise?.then((unsubscribe) => unsubscribe()).catch(() => undefined);
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
      hasLoadedFrameRef.current = false;
    };

    const sendLocalCandidate = (
      candidate: RTCIceCandidate,
      expectedGeneration: number,
      activeSessionId: string
    ) => {
      void integrationCameraFeatureService
        .addCameraWebRtcCandidate(entityId, activeSessionId, candidate.toJSON())
        .catch(() => reportWebRtcSignalingError(expectedGeneration));
    };

    const sendPendingCandidates = (expectedGeneration: number) => {
      if (!sessionId) {
        return;
      }

      const activeSessionId = sessionId;
      for (const candidate of pendingCandidates.splice(0)) {
        sendLocalCandidate(candidate, expectedGeneration, activeSessionId);
      }
    };

    const flushPendingRemoteCandidates = async (
      connection: RTCPeerConnection,
      expectedGeneration: number
    ) => {
      if (expectedGeneration !== playbackGeneration || !remoteDescriptionReady) {
        return;
      }

      for (const candidate of pendingRemoteCandidates.splice(0)) {
        if (expectedGeneration !== playbackGeneration) {
          return;
        }
        await connection.addIceCandidate(
          new RTCIceCandidate(normalizeRemoteIceCandidate(candidate))
        );
      }
    };

    const refreshStartupTimeout = (expectedGeneration: number) => {
      if (hasLoadedFrameRef.current) {
        return;
      }

      clearStreamLoadTimeout(loadTimeoutRef);
      loadTimeoutRef.current = window.setTimeout(() => {
        loadTimeoutRef.current = null;
        reportWebRtcSignalingError(expectedGeneration);
      }, CAMERA_WEBRTC_STREAM_LOAD_TIMEOUT_MS);
    };

    const start = async () => {
      cleanUp();
      if (document.hidden) {
        return;
      }
      const activeGeneration = playbackGeneration;
      const isInactive = () =>
        cancelled || document.hidden || activeGeneration !== playbackGeneration;

      const video = videoRef.current;
      webRtcSignalingErrorReported = false;
      if (!video || typeof RTCPeerConnection === 'undefined') {
        reportWebRtcSignalingError(activeGeneration);
        return;
      }

      setHasLoadedFrame(false);
      hasLoadedFrameRef.current = false;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      refreshStartupTimeout(activeGeneration);

      try {
        const clientConfig =
          await integrationCameraFeatureService.getWebRtcClientConfiguration(entityId);
        if (isInactive()) {
          return;
        }
        refreshStartupTimeout(activeGeneration);

        const connection = new RTCPeerConnection(clientConfig.configuration);
        peerConnection = connection;
        if (clientConfig.dataChannel) {
          connection.createDataChannel(clientConfig.dataChannel);
        }

        const activeRemoteStream = new MediaStream();
        let hasRemoteVideoTrack = false;
        remoteStream = activeRemoteStream;
        decodedFrameMonitorCleanup = subscribeDecodedVideoFrameMonitor({
          video,
          isActive: () => !isInactive(),
          ownsVideoElement: () => video.srcObject === activeRemoteStream,
          hasVideoSource: () => hasRemoteVideoTrack,
          onReady: () => {
            if (isInactive() || hasLoadedFrameRef.current) {
              return;
            }
            hasLoadedFrameRef.current = true;
            setHasLoadedFrame(true);
            clearStreamLoadTimeout(loadTimeoutRef);
            onLoadRef.current?.();
          },
          onError: () => reportWebRtcSignalingError(activeGeneration),
        });
        connection.ontrack = (event) => {
          if (isInactive() || !videoRef.current) {
            return;
          }
          refreshStartupTimeout(activeGeneration);
          activeRemoteStream.addTrack(event.track);
          if (event.track.kind === 'video') {
            hasRemoteVideoTrack = true;
            event.track.addEventListener?.(
              'ended',
              () => reportWebRtcSignalingError(activeGeneration),
              { once: true }
            );
          }
          videoRef.current.srcObject = activeRemoteStream;
          void videoRef.current.play().catch(() => undefined);
        };
        connection.onicecandidate = (event) => {
          if (isInactive() || !event.candidate?.candidate) {
            return;
          }
          if (!sessionId) {
            pendingCandidates.push(event.candidate);
            return;
          }
          sendLocalCandidate(event.candidate, activeGeneration, sessionId);
        };
        connection.oniceconnectionstatechange = () => {
          if (isInactive()) {
            return;
          }
          const iceState = connection.iceConnectionState;
          if (iceState !== 'disconnected' && disconnectedTimeout !== null) {
            window.clearTimeout(disconnectedTimeout);
            disconnectedTimeout = null;
          }
          if (iceState === 'checking' || iceState === 'connected' || iceState === 'completed') {
            refreshStartupTimeout(activeGeneration);
          }
          if (iceState === 'disconnected' && disconnectedTimeout === null) {
            disconnectedTimeout = window.setTimeout(() => {
              disconnectedTimeout = null;
              reportWebRtcSignalingError(activeGeneration);
            }, CAMERA_WEBRTC_DISCONNECTED_GRACE_MS);
          }
          if (iceState === 'failed' || iceState === 'closed') {
            reportWebRtcSignalingError(activeGeneration);
          }
        };

        connection.addTransceiver('audio', { direction: 'recvonly' });
        connection.addTransceiver('video', { direction: 'recvonly' });

        const offer = await connection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await connection.setLocalDescription(offer);
        if (!offer.sdp || isInactive()) {
          return;
        }
        refreshStartupTimeout(activeGeneration);

        unsubscribePromise = integrationCameraFeatureService.subscribeCameraWebRtcOffer(
          entityId,
          offer.sdp,
          (event) => {
            if (isInactive() || !peerConnection) {
              return;
            }
            if (event.type === 'session') {
              sessionId = event.session_id;
              refreshStartupTimeout(activeGeneration);
              sendPendingCandidates(activeGeneration);
              return;
            }
            if (event.type === 'answer') {
              void connection
                .setRemoteDescription(
                  new RTCSessionDescription({ type: 'answer', sdp: event.answer })
                )
                .then(async () => {
                  if (isInactive()) {
                    return;
                  }
                  remoteDescriptionReady = true;
                  refreshStartupTimeout(activeGeneration);
                  await flushPendingRemoteCandidates(connection, activeGeneration);
                })
                .catch(() => reportWebRtcSignalingError(activeGeneration));
              return;
            }
            if (event.type === 'candidate') {
              if (!remoteDescriptionReady) {
                pendingRemoteCandidates.push(event.candidate);
                return;
              }
              refreshStartupTimeout(activeGeneration);
              void connection
                .addIceCandidate(new RTCIceCandidate(normalizeRemoteIceCandidate(event.candidate)))
                .catch(() => reportWebRtcSignalingError(activeGeneration));
              return;
            }
            reportWebRtcSignalingError(activeGeneration);
          }
        );
        void unsubscribePromise.catch(() => reportWebRtcSignalingError(activeGeneration));
      } catch {
        reportWebRtcSignalingError(activeGeneration);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanUp();
        setHasLoadedFrame(false);
        return;
      }
      void start();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (!document.hidden) {
      void start();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanUp();
    };
  }, [entityId, onError, streamResourceUrl]);

  if (streamResourceUrl && directStreamResource && directStreamPresentation === 'native') {
    return (
      <DirectGo2RtcCameraPlayer
        posterUrl={posterUrl}
        streamResource={directStreamResource}
        fitMode={fitMode}
        loadingLabel={loadingLabel}
        title={webRtcTitle}
        onLoad={onLoad}
        onError={handleDirectStreamError}
      />
    );
  }

  if (streamResourceUrl) {
    return (
      <OpaqueGo2RtcCameraPlayer
        url={streamResourceUrl}
        posterUrl={posterUrl}
        fitMode={fitMode}
        loadingLabel={loadingLabel}
        title={webRtcTitle}
        onError={handleDirectStreamError}
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {!hasLoadedFrame ? (
        <CameraStreamLoadingIndicator
          label={loadingLabel}
          posterUrl={posterUrl}
          fitMode={fitMode}
        />
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        className={`${CAMERA_MEDIA_SURFACE_CLASS_NAME} ${videoFitClassNames[fitMode]}`}
        muted
        playsInline
        style={{ opacity: hasLoadedFrame ? 1 : 0 }}
      />
    </div>
  );
}

export const CameraStreamPlayer = memo(function CameraStreamPlayer(props: CameraStreamPlayerProps) {
  if (props.kind === 'hls' || props.kind === 'mse') {
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
    previous.loadingLabel === next.loadingLabel &&
    previous.webRtcTitle === next.webRtcTitle &&
    getStreamResourceKey(previous.streamResource) === getStreamResourceKey(next.streamResource) &&
    previous.posterUrl === next.posterUrl
  );
}
