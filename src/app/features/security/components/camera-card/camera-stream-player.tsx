import { useEffect, useRef } from 'react';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { CameraImageSourceKind } from './camera-view-mode';

interface CameraStreamPlayerProps {
  entityId: string;
  kind: Extract<CameraImageSourceKind, 'hls' | 'web_rtc'>;
  posterUrl: string | undefined;
  homeAssistantUrl: string | undefined;
  fitMode: 'cover' | 'contain';
  onLoad?: () => void;
  onError: (kind: CameraImageSourceKind) => void;
}

const videoFitClassNames = {
  contain: 'object-contain',
  cover: 'object-cover',
} as const;

function resolveHomeAssistantUrl(url: string, homeAssistantUrl: string | undefined) {
  return url.startsWith('/') && homeAssistantUrl ? `${homeAssistantUrl}${url}` : url;
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

function HlsCameraPlayer({
  entityId,
  posterUrl,
  homeAssistantUrl,
  fitMode,
  onLoad,
  onError,
}: Omit<CameraStreamPlayerProps, 'kind'>) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

      try {
        const stream = await homeAssistantService.getCameraStreamUrl(entityId, 'hls');
        if (cancelled) {
          return;
        }

        const streamUrl = resolveHomeAssistantUrl(stream.url, homeAssistantUrl);
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
          onError('hls');
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
      } catch {
        if (!cancelled) {
          onError('hls');
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
  }, [entityId, homeAssistantUrl, onError, posterUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      className={`h-full w-full ${videoFitClassNames[fitMode]}`}
      muted
      onLoadedData={onLoad}
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
}: Omit<CameraStreamPlayerProps, 'kind' | 'homeAssistantUrl'>) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
    };

    const sendPendingCandidates = () => {
      if (!sessionId) {
        return;
      }

      for (const candidate of pendingCandidates.splice(0)) {
        void homeAssistantService.addCameraWebRtcCandidate(entityId, sessionId, candidate.toJSON());
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

      try {
        const clientConfig = await homeAssistantService.getWebRtcClientConfiguration(entityId);
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
          void homeAssistantService.addCameraWebRtcCandidate(
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

        unsubscribePromise = homeAssistantService.subscribeCameraWebRtcOffer(
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
      onLoadedData={onLoad}
      onError={() => onError('web_rtc')}
      playsInline
    />
  );
}

export function CameraStreamPlayer(props: CameraStreamPlayerProps) {
  if (props.kind === 'hls') {
    return <HlsCameraPlayer {...props} />;
  }

  return <WebRtcCameraPlayer {...props} />;
}
