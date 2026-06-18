import { BaseCardDialog } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useEntityProviderFeatureMatrix, useI18n, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type {
  PlatformCameraState,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import type { CameraStreamPreference, CameraViewMode } from '@navet/app/stores/settings-store';
import { Camera, RefreshCw, Settings2, Video, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCameraPlaybackPlan } from '../../hooks/use-camera-playback-plan';
import { CameraSnapshotImage } from './camera-snapshot-image';
import { CameraStreamPlayer } from './camera-stream-player';
import type { CameraImageSourceKind } from './camera-view-mode';
import type { CameraCardImageSource } from './types';

interface CameraLiveViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  name: string;
  room: string;
  cameraState: PlatformCameraState;
  snapshotUrl: string | undefined;
  snapshotSources?: readonly CameraCardImageSource[];
  cameraViewMode: CameraViewMode;
  preferredTransport: CameraStreamPreference;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  initialStreamResource: ResolvedPlatformResource | null;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
}

const CAMERA_VIEW_OPTIONS: CameraViewMode[] = ['live', 'auto', 'snapshot'];

function CameraViewerModeControl({
  supportedModes,
  value,
  onChange,
}: {
  supportedModes: CameraViewMode[];
  value: CameraViewMode;
  onChange: (mode: CameraViewMode) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-full border border-white/12 bg-black/45 p-1 text-xs font-semibold text-white backdrop-blur-xl">
      {CAMERA_VIEW_OPTIONS.filter((mode) => supportedModes.includes(mode)).map((mode) => (
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
  cameraState,
  snapshotUrl,
  snapshotSources,
  cameraViewMode,
  preferredTransport,
  isStreamCapable,
  motionDetectionEnabled,
  initialStreamResource,
  onRefresh,
  onOpenSettings,
  onCameraViewModeChange,
}: CameraLiveViewerProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const featureMatrix = useEntityProviderFeatureMatrix(entityId);
  const [failedStreamTypes, setFailedStreamTypes] = useState<PlatformCameraTransport[]>([]);
  const supportsCameraStreams = featureMatrix.cameraStreams;
  const supportsCameraSnapshot = featureMatrix.cameraSnapshot;
  const playbackModel = useCameraPlaybackPlan({
    entityId,
    cameraState,
    preferredMode: supportsCameraStreams ? cameraViewMode : 'snapshot',
    preferredTransport,
    snapshotUrl: supportsCameraSnapshot ? snapshotUrl : undefined,
    isStreamCapable: supportsCameraStreams && isStreamCapable,
    motionDetectionEnabled,
    failedTransports: new Set(failedStreamTypes),
  });

  useEffect(() => {
    setFailedStreamTypes([]);
  }, [cameraState, cameraViewMode, isOpen, isStreamCapable, preferredTransport]);

  const handleStreamError = useCallback((kind: CameraImageSourceKind) => {
    if (kind === 'snapshot') {
      return;
    }

    setFailedStreamTypes((current) => (current.includes(kind) ? current : [...current, kind]));
  }, []);

  const supportedModes = useMemo<CameraViewMode[]>(() => {
    const modes: CameraViewMode[] = [];
    const canStream = supportsCameraStreams && isStreamCapable;
    const canShowSnapshot = supportsCameraSnapshot && Boolean(snapshotUrl);

    if (canStream) {
      modes.push('live', 'auto');
    }
    if (canShowSnapshot) {
      modes.push('snapshot');
    }
    return modes.length > 0 ? modes : ['snapshot'];
  }, [isStreamCapable, snapshotUrl, supportsCameraSnapshot, supportsCameraStreams]);

  const selectedTransport = playbackModel?.selectedTransport ?? null;
  const snapshotSourceUrl = playbackModel?.snapshotResource?.url;
  const showNoSignal = !selectedTransport && !snapshotSourceUrl && cameraState !== 'unavailable';
  const streamTypeLabel = useMemo(() => {
    if (!playbackModel) {
      return supportsCameraStreams
        ? t('camera.viewer.streamCapable')
        : t('camera.viewer.snapshotOnly');
    }
    if (playbackModel.isSnapshotFallback) {
      return t('camera.viewer.snapshotFallback');
    }
    if (
      selectedTransport === 'hls' ||
      selectedTransport === 'web_rtc' ||
      selectedTransport === 'mjpeg'
    ) {
      return selectedTransport.toUpperCase();
    }
    return playbackModel.supportsStreaming
      ? t('camera.viewer.streamCapable')
      : t('camera.viewer.snapshotOnly');
  }, [playbackModel, selectedTransport, supportsCameraStreams, t]);

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={name}
      description={t('camera.viewer.description')}
      theme={theme}
      disableOpenAutoFocus
      contentTitle={name}
      contentDescription={t('camera.viewer.description')}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      shellBodyClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-black text-white">
        <div className="absolute inset-0">
          {selectedTransport && cameraState !== 'unavailable' ? (
            <CameraStreamPlayer
              entityId={entityId}
              kind={selectedTransport}
              posterUrl={snapshotSourceUrl}
              streamResource={
                initialStreamResource?.kind === 'hls_stream' ||
                initialStreamResource?.kind === 'webrtc_stream' ||
                initialStreamResource?.kind === 'mjpeg_stream'
                  ? initialStreamResource
                  : (playbackModel?.selectedStreamResource ?? null)
              }
              fitMode="contain"
              onError={handleStreamError}
            />
          ) : snapshotSourceUrl && cameraState !== 'unavailable' ? (
            <CameraSnapshotImage
              src={snapshotSourceUrl}
              sources={snapshotSources}
              alt={name}
              className="h-full w-full object-contain"
              onError={() => undefined}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-zinc-950">
              <Camera className="h-12 w-12 text-white/35" />
              <span className="text-sm text-white/58">
                {cameraState === 'unavailable'
                  ? t('camera.status.unavailable')
                  : showNoSignal
                    ? t('camera.status.noSignal')
                    : t('common.off')}
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
                  cameraState === 'streaming' || cameraState === 'recording'
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.68)]'
                    : 'bg-white/45'
                }`}
              />
              <Video className="h-3.5 w-3.5 text-white/72" />
              <span>
                {cameraState === 'streaming' || cameraState === 'recording'
                  ? t('camera.status.live')
                  : cameraState === 'off'
                    ? t('common.off')
                    : cameraState === 'unavailable'
                      ? t('camera.status.unavailable')
                      : t('common.on')}
              </span>
              {playbackModel?.isSnapshotFallback ? (
                <span className="text-white/58">{t('camera.viewer.snapshotFallback')}</span>
              ) : null}
            </div>

            <CameraViewerModeControl
              supportedModes={supportedModes}
              value={supportedModes.includes(cameraViewMode) ? cameraViewMode : supportedModes[0]}
              onChange={onCameraViewModeChange}
            />
          </div>
        </div>
      </div>
    </BaseCardDialog>
  );
}
