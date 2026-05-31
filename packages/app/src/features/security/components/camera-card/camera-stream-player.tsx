import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import {
  getCurrentCameraPanelHass,
  resolveCameraStreamResource,
} from '@navet/app/services/integration-camera-runtime.service';
import type { CameraGo2RtcConfig } from '@navet/app/stores/settings-store';
import { useEffect, useRef } from 'react';
import type { CameraImageSourceKind } from './camera-view-mode';

interface CameraStreamPlayerProps {
  entityId: string;
  kind: Extract<CameraImageSourceKind, 'go2rtc' | 'hls' | 'web_rtc'>;
  posterUrl: string | undefined;
  go2RtcConfig?: CameraGo2RtcConfig;
  fitMode: 'cover' | 'contain';
  onLoad?: () => void;
  onError: (kind: CameraImageSourceKind, options?: CameraStreamErrorOptions) => void;
}

const CAMERA_STREAM_LOAD_TIMEOUT_MS = 10_000;

const videoFitClassNames = {
  contain: 'object-contain',
  cover: 'object-cover',
} as const;

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

function clearStreamLoadTimeout(timeoutRef: React.MutableRefObject<number | null>) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

function scheduleStreamLoadTimeout(
  timeoutRef: React.MutableRefObject<number | null>,
  kind: CameraImageSourceKind,
  onError: CameraStreamPlayerProps['onError']
) {
  clearStreamLoadTimeout(timeoutRef);
  timeoutRef.current = window.setTimeout(() => {
    timeoutRef.current = null;
    onError(kind);
  }, CAMERA_STREAM_LOAD_TIMEOUT_MS);
}

function HlsCameraPlayer({
  entityId,
  posterUrl,
  fitMode,
  onLoad,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind'>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  const handleLoadedData = () => {
    clearStreamLoadTimeout(loadTimeoutRef);
    onLoad?.();
  };

  useEffect(() => {
    let cancelled = false;
    let cleanupHls: (() => void) | undefined;

    const cleanUp = () => {
      cleanupHls?.();
      cleanupHls = undefined;
      const video = videoRef.current;
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
      clearStreamLoadTimeout(loadTimeoutRef);
    };

    const start = async () => {
      cleanUp();
      if (document.hidden) {
        return;
      }

      const video = videoRef.current;
      if (!video) {
        return;
      }

      applyVideoBaseAttributes(video, posterUrl);
      scheduleStreamLoadTimeout(loadTimeoutRef, 'hls', onError);

      try {
        const stream = await integrationCameraFeatureService.getCameraStreamUrl(entityId, 'hls');
        if (cancelled) {
          return;
        }

        const streamUrl =
          (await resolveCameraStreamResource(entityId, 'hls', stream.url)).url ?? stream.url;
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          await video.play().catch(() => undefined);
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
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(streamUrl));
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            onError('hls');
          }
        });
      } catch (error) {
        if (!cancelled) {
          clearStreamLoadTimeout(loadTimeoutRef);
          onError('hls', {
            retryable: !isHomeAssistantCameraStreamUnsupportedError(error),
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanUp();
      } else {
        void start();
      }
    };

    void start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanUp();
    };
  }, [entityId, onError, posterUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      className={`h-full w-full ${videoFitClassNames[fitMode]}`}
      muted
      onLoadedData={handleLoadedData}
      onError={() => onError('hls')}
      playsInline
    />
  );
}

function WebRtcCameraPlayer({
  entityId,
  posterUrl,
  fitMode,
  onLoad,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind'>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  const handleLoadedData = () => {
    clearStreamLoadTimeout(loadTimeoutRef);
    onLoad?.();
  };

  useEffect(() => {
    let cancelled = false;
    let peerConnection: RTCPeerConnection | undefined;
    let remoteStream: MediaStream | undefined;
    let unsubscribePromise: Promise<() => void> | undefined;
    let sessionId: string | undefined;
    const pendingCandidates: RTCIceCandidate[] = [];

    const cleanUp = () => {
      remoteStream?.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStream = undefined;
      peerConnection?.close();
      peerConnection = undefined;
      void unsubscribePromise?.then((unsubscribe) => unsubscribe());
      unsubscribePromise = undefined;
      sessionId = undefined;
      pendingCandidates.length = 0;

      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
        video.removeAttribute('src');
        video.load();
      }
      clearStreamLoadTimeout(loadTimeoutRef);
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

      applyVideoBaseAttributes(video, posterUrl);
      scheduleStreamLoadTimeout(loadTimeoutRef, 'web_rtc', onError);

      try {
        const clientConfig =
          await integrationCameraFeatureService.getWebRtcClientConfiguration(entityId);
        if (cancelled) {
          return;
        }

        peerConnection = new RTCPeerConnection(clientConfig.configuration);
        if (clientConfig.dataChannel) {
          peerConnection.createDataChannel(clientConfig.dataChannel);
        }

        remoteStream = new MediaStream();
        peerConnection.ontrack = (event) => {
          if (!remoteStream || !videoRef.current) {
            return;
          }
          remoteStream.addTrack(event.track);
          videoRef.current.srcObject = remoteStream;
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
              sendPendingCandidates();
              return;
            }
            if (event.type === 'answer') {
              void peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: event.answer })
              );
              return;
            }
            if (event.type === 'candidate') {
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanUp();
      } else {
        void start();
      }
    };

    void start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanUp();
    };
  }, [entityId, onError, posterUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      className={`h-full w-full ${videoFitClassNames[fitMode]}`}
      muted
      onLoadedData={handleLoadedData}
      onError={() => onError('web_rtc')}
      playsInline
    />
  );
}

interface Go2RtcCameraElement extends HTMLElement {
  hass?: unknown;
  setConfig?: (config: Record<string, unknown>) => void;
}

export function resolveGo2RtcWebSocketUrl(config: CameraGo2RtcConfig | undefined) {
  const serverUrl = config?.serverUrl.trim();
  const streamName = config?.streamName.trim();
  if (!serverUrl || !streamName) {
    return null;
  }

  try {
    const normalizedServerUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(serverUrl)
      ? serverUrl
      : `${window.location.protocol === 'https:' ? 'https' : 'http'}://${serverUrl}`;
    const url = new URL(normalizedServerUrl, window.location.origin);
    if (url.protocol === 'http:') {
      url.protocol = 'ws:';
    } else if (url.protocol === 'https:') {
      url.protocol = 'wss:';
    } else if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      return null;
    }

    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/api/ws';
    }
    url.searchParams.set('src', streamName);
    return url.toString();
  } catch {
    return null;
  }
}

function Go2RtcDirectCameraPlayer({
  go2RtcConfig,
  posterUrl,
  fitMode,
  onLoad,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind' | 'entityId'>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  const handleLoadedData = () => {
    clearStreamLoadTimeout(loadTimeoutRef);
    onLoad?.();
  };

  useEffect(() => {
    let cancelled = false;
    let hasRemoteTrack = false;
    let socket: WebSocket | undefined;
    let peerConnection: RTCPeerConnection | undefined;
    let remoteStream: MediaStream | undefined;

    const cleanUp = () => {
      remoteStream?.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStream = undefined;
      peerConnection?.close();
      peerConnection = undefined;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
      socket = undefined;

      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
        video.removeAttribute('src');
        video.load();
      }
      clearStreamLoadTimeout(loadTimeoutRef);
    };

    const fail = () => {
      if (!cancelled) {
        onError('go2rtc');
      }
    };

    const start = () => {
      cleanUp();
      if (document.hidden) {
        return;
      }

      const video = videoRef.current;
      const webSocketUrl = resolveGo2RtcWebSocketUrl(go2RtcConfig);
      if (!video || !webSocketUrl || typeof RTCPeerConnection === 'undefined') {
        fail();
        return;
      }

      applyVideoBaseAttributes(video, posterUrl);
      scheduleStreamLoadTimeout(loadTimeoutRef, 'go2rtc', onError);

      try {
        remoteStream = new MediaStream();
        peerConnection = new RTCPeerConnection();
        socket = new WebSocket(webSocketUrl);

        peerConnection.ontrack = (event) => {
          hasRemoteTrack = true;
          if (!remoteStream || !videoRef.current) {
            return;
          }

          const streamTracks = event.streams[0]?.getTracks() ?? [];
          const tracks = streamTracks.length > 0 ? streamTracks : [event.track];
          for (const track of tracks) {
            if (!remoteStream.getTracks().includes(track)) {
              remoteStream.addTrack(track);
            }
          }
          videoRef.current.srcObject = remoteStream;
        };
        peerConnection.onicecandidate = (event) => {
          if (!event.candidate || socket?.readyState !== WebSocket.OPEN) {
            return;
          }

          socket.send(
            JSON.stringify({
              type: 'webrtc/candidate',
              value: event.candidate.candidate,
            })
          );
        };
        peerConnection.oniceconnectionstatechange = () => {
          if (
            peerConnection?.iceConnectionState === 'failed' ||
            peerConnection?.iceConnectionState === 'disconnected'
          ) {
            fail();
          }
        };

        socket.onopen = () => {
          void (async () => {
            if (!peerConnection || !socket || cancelled) {
              return;
            }

            peerConnection.addTransceiver('audio', { direction: 'recvonly' });
            peerConnection.addTransceiver('video', { direction: 'recvonly' });
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            if (!offer.sdp || socket.readyState !== WebSocket.OPEN || cancelled) {
              return;
            }

            socket.send(JSON.stringify({ type: 'webrtc/offer', value: offer.sdp }));
          })().catch(fail);
        };
        socket.onmessage = (event) => {
          void (async () => {
            if (!peerConnection || cancelled) {
              return;
            }

            const message = JSON.parse(String(event.data)) as {
              type?: string;
              value?: unknown;
            };
            if (message.type === 'webrtc/answer' && typeof message.value === 'string') {
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: message.value })
              );
              return;
            }

            if (message.type === 'webrtc/candidate' && typeof message.value === 'string') {
              await peerConnection.addIceCandidate(
                new RTCIceCandidate({ candidate: message.value })
              );
              return;
            }

            if (message.type === 'error') {
              fail();
            }
          })().catch(fail);
        };
        socket.onerror = fail;
        socket.onclose = () => {
          if (!hasRemoteTrack) {
            fail();
          }
        };
      } catch {
        fail();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanUp();
      } else {
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanUp();
    };
  }, [go2RtcConfig, onError, posterUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      className={`h-full w-full ${videoFitClassNames[fitMode]}`}
      muted
      onLoadedData={handleLoadedData}
      onError={() => onError('go2rtc')}
      playsInline
    />
  );
}

function Go2RtcCustomCardPlayer({
  entityId,
  fitMode,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind' | 'posterUrl' | 'onLoad'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const hass = getCurrentCameraPanelHass();
    const customElementConstructor = customElements.get('webrtc-camera');

    if (!container || !hass || !customElementConstructor) {
      onError('go2rtc');
      return;
    }

    const cameraElement = document.createElement('webrtc-camera') as Go2RtcCameraElement;
    cameraElement.className = 'block h-full w-full overflow-hidden';
    cameraElement.style.display = 'block';
    cameraElement.style.width = '100%';
    cameraElement.style.height = '100%';
    cameraElement.hass = hass;
    cameraElement.setConfig?.({
      type: 'custom:webrtc-camera',
      entity: entityId,
      mode: 'webrtc',
      muted: true,
      background: true,
      style: `ha-card { height: 100%; overflow: hidden; border-radius: 0; box-shadow: none; background: transparent; } video { width: 100%; height: 100%; object-fit: ${fitMode}; }`,
    });

    container.replaceChildren(cameraElement);

    return () => {
      container.replaceChildren();
    };
  }, [entityId, fitMode, onError]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function Go2RtcCameraPlayer(props: Omit<CameraStreamPlayerProps, 'kind'>) {
  if (resolveGo2RtcWebSocketUrl(props.go2RtcConfig)) {
    return <Go2RtcDirectCameraPlayer {...props} />;
  }

  return <Go2RtcCustomCardPlayer {...props} />;
}

export function CameraStreamPlayer(props: CameraStreamPlayerProps) {
  if (props.kind === 'go2rtc') {
    return <Go2RtcCameraPlayer {...props} />;
  }

  if (props.kind === 'hls') {
    return <HlsCameraPlayer {...props} />;
  }

  return <WebRtcCameraPlayer {...props} />;
}
