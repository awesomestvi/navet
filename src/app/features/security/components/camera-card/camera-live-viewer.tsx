import { Camera, RefreshCw, Settings2, Video, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DialogShell } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useCameraPlaybackPlan } from '@/app/features/security/hooks/use-camera-playback-plan';
import { useI18n, useTheme } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import type {
  CameraFeedMode,
  CameraGo2RtcConfig,
  CameraViewMode,
} from '@/app/stores/settings-store';
import { CameraStreamPlayer } from './camera-stream-player';
import type { CameraImageSourceKind, CameraStreamType } from './camera-view-mode';

interface CameraLiveViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  name: string;
  room: string;
  snapshotUrl: string | undefined;
  mjpegStreamUrl: string | undefined;
  cameraViewMode: CameraViewMode;
  cameraFeedMode: CameraFeedMode;
  go2RtcConfig: CameraGo2RtcConfig;
  isUnavailable: boolean;
  isRunning: boolean;
  isStreamCapable: boolean;
  frontendStreamTypes: readonly CameraStreamType[];
  hasGo2RtcFeed: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
}

const CAMERA_VIEW_OPTIONS: CameraViewMode[] = ['live', 'auto', 'snapshot'];

function CameraViewerModeControl({
  value,
  onChange,
}: {
  value: CameraViewMode;
  onChange: (mode: CameraViewMode) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-full border border-white/12 bg-black/45 p-1 text-xs font-semibold text-white backdrop-blur-xl">
      {CAMERA_VIEW_OPTIONS.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`min-w-0 rounded-full px-3 py-1.5 transition-colors ${
            mode === value
              ? 'bg-white text-black'
              : 'text-white/72 hover:bg-white/12 hover:text-white'
          }`}
          aria-pressed={mode === value}
        >
          {t(`camera.settings.viewMode.${mode}` as TranslationKey)}
        </button>
      ))}
    </div>
  );
}

export function CameraLiveViewer({
  isOpen,
  onOpenChange,
  entityId,
  name,
  room,
  snapshotUrl,
  mjpegStreamUrl,
  cameraViewMode,
  cameraFeedMode,
  go2RtcConfig,
  isUnavailable,
  isRunning,
  isStreamCapable,
  frontendStreamTypes,
  hasGo2RtcFeed,
  onRefresh,
  onOpenSettings,
  onCameraViewModeChange,
}: CameraLiveViewerProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [failedStreamTypes, setFailedStreamTypes] = useState<CameraImageSourceKind[]>([]);
  const streamFailureResetKey = `${isOpen}:${cameraViewMode}:${cameraFeedMode}:${go2RtcConfig.serverUrl}:${go2RtcConfig.streamName}:${frontendStreamTypes.join(',')}`;
  const failedStreamTypeSet = useMemo(() => new Set(failedStreamTypes), [failedStreamTypes]);
  const playbackPlan = useCameraPlaybackPlan({
    entityId,
    preferredMode: cameraViewMode,
    preferredTransport: cameraFeedMode,
    snapshotUrl,
    mjpegStreamUrl,
    frontendStreamTypes,
    hasGo2RtcFeed,
    isUnavailable,
    isRunning,
    failedTransports: failedStreamTypeSet,
  });
  const source =
    playbackPlan?.primary.kind === 'webrtc_stream'
      ? {
          url: undefined,
          kind:
            playbackPlan.primary.metadata?.source === 'go2rtc' ? 'go2rtc' : ('web_rtc' as const),
          isFallback: false,
        }
      : playbackPlan?.primary.kind === 'hls_stream'
        ? { url: undefined, kind: 'hls' as const, isFallback: false }
        : playbackPlan?.primary.kind === 'mjpeg_stream'
          ? { url: playbackPlan.primary.url, kind: 'mjpeg' as const, isFallback: false }
          : {
              url: playbackPlan?.primary.url ?? snapshotUrl,
              kind: 'snapshot' as const,
              isFallback: cameraViewMode === 'live',
            };
  const sourceUrl = source.url;
  const videoStreamKind =
    source.kind === 'go2rtc' || source.kind === 'hls' || source.kind === 'web_rtc'
      ? source.kind
      : null;
  const streamTypeLabel = useMemo(() => {
    if (source.isFallback) {
      return t('camera.viewer.snapshotFallback');
    }
    if (source.kind === 'go2rtc') {
      return 'go2rtc';
    }
    if (source.kind === 'hls' || source.kind === 'web_rtc' || source.kind === 'mjpeg') {
      return source.kind.toUpperCase();
    }
    if (frontendStreamTypes.length > 0) {
      return frontendStreamTypes.join(' / ').toUpperCase();
    }

    return isStreamCapable ? t('camera.viewer.streamCapable') : t('camera.viewer.snapshotOnly');
  }, [frontendStreamTypes, isStreamCapable, source.isFallback, source.kind, t]);

  useEffect(() => {
    void streamFailureResetKey;
    setFailedStreamTypes([]);
  }, [streamFailureResetKey]);

  const handleStreamError = useCallback((kind: CameraImageSourceKind) => {
    setFailedStreamTypes((current) => (current.includes(kind) ? current : [...current, kind]));
  }, []);

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      mobileCoverSheet={false}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentTitle={name}
      contentDescription={t('camera.viewer.description')}
      contentClassName="fixed inset-3 z-50 overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200 md:inset-8"
      bodyClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-black text-white">
        <div className="absolute inset-0">
          {videoStreamKind && !isUnavailable ? (
            <CameraStreamPlayer
              entityId={entityId}
              kind={videoStreamKind}
              posterUrl={snapshotUrl}
              go2RtcConfig={go2RtcConfig}
              fitMode="contain"
              onError={handleStreamError}
            />
          ) : sourceUrl && !isUnavailable ? (
            <img
              key={sourceUrl}
              src={sourceUrl}
              alt={name}
              className="h-full w-full object-contain"
              draggable={false}
              onError={() => handleStreamError(source.kind)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-zinc-950">
              <Camera className="h-12 w-12 text-white/35" />
              <span className="text-sm text-white/58">
                {isUnavailable ? t('camera.status.unavailable') : t('camera.status.noSignal')}
              </span>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/45 to-transparent p-4 md:p-5">
          <div className="pointer-events-auto flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/76">
                <span>{room}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>{streamTypeLabel}</span>
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight md:text-2xl">
                {name}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/45 text-white backdrop-blur-xl transition-colors hover:bg-white/12"
                aria-label={t('camera.actions.refreshSnapshot')}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/45 text-white backdrop-blur-xl transition-colors hover:bg-white/12"
                aria-label={t('camera.actions.openSettings')}
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/45 text-white backdrop-blur-xl transition-colors hover:bg-white/12"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
              <span
                className={`h-2 w-2 rounded-full ${
                  isRunning ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 'bg-white/45'
                }`}
              />
              <Video className="h-3.5 w-3.5 text-white/72" />
              <span>{isRunning ? t('camera.status.live') : t('common.off')}</span>
              {source.isFallback ? (
                <span className="text-white/58">{t('camera.viewer.snapshotFallback')}</span>
              ) : null}
            </div>

            <CameraViewerModeControl value={cameraViewMode} onChange={onCameraViewModeChange} />
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
