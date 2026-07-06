import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import { useTheme } from '@navet/app/hooks/use-theme';
import type { TranslationKey } from '@navet/app/i18n';
import type { PlatformCameraState } from '@navet/app/platform/provider-feature-models';
import type { CameraFitMode, CameraViewMode } from '@navet/app/stores/settings-store';
import { Camera, Eye, RefreshCw, Settings2 } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useState } from 'react';
import { CameraSnapshotImage } from './camera-snapshot-image';
import type { CameraImageSourceKind, CameraStreamType } from './camera-view-mode';
import type { CameraCardImageSource } from './types';

interface CameraCardViewProps {
  id: string;
  name: string;
  room: string;
  cardRef?: RefObject<HTMLDivElement | null>;
  imageUrl: string | undefined;
  imageSources?: readonly CameraCardImageSource[];
  streamElement?: ReactNode;
  cameraState: PlatformCameraState;
  statusChangedAt: number | null;
  motionDetected: boolean;
  motionChangedAt: number | null;
  motionDetectionEnabled: boolean | null;
  now: number;
  size: CardSize;
  isEditMode: boolean;
  cameraViewMode: CameraViewMode;
  fitMode: CameraFitMode;
  isStreamCapable: boolean;
  frontendStreamTypes: readonly CameraStreamType[];
  streamKind: CameraImageSourceKind;
  hideStreamLabel?: boolean;
  hideStreamStatus?: boolean;
  isStreamFallback: boolean;
  onRefresh: () => void;
  onImageError: () => void;
  onOpenSettings: () => void;
  onOpenViewer: () => void;
  onToggleMotionDetection: () => void;
}

function formatElapsedCompact(now: number, since: number | null) {
  if (!since) {
    return null;
  }

  const diffSeconds = Math.max(0, Math.floor((now - since) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}

function getCameraStatusLabel(
  t: (key: TranslationKey) => string,
  cameraState: PlatformCameraState,
  isFeedRunning: boolean
) {
  if (isFeedRunning || cameraState === 'streaming' || cameraState === 'recording') {
    return null;
  }

  if (cameraState === 'off') {
    return t('common.off');
  }

  return null;
}

export function CameraCardView({
  id,
  name,
  room,
  cardRef,
  imageUrl,
  imageSources,
  streamElement,
  cameraState,
  statusChangedAt,
  motionDetected,
  motionChangedAt,
  motionDetectionEnabled,
  now,
  size,
  isEditMode,
  cameraViewMode,
  fitMode,
  isStreamCapable,
  frontendStreamTypes,
  streamKind,
  hideStreamLabel = false,
  hideStreamStatus = false,
  isStreamFallback,
  onRefresh,
  onImageError,
  onOpenSettings,
  onOpenViewer,
  onToggleMotionDetection,
}: CameraCardViewProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [snapshotFailed, setSnapshotFailed] = useState(false);

  useEffect(() => {
    setSnapshotFailed(false);
  }, [imageUrl]);

  const surface = getThemeSurfaceTokens(theme);
  const isCompact = isCompactCardSize(size);
  const isLightTheme = theme === 'light';
  const isUnavailable = cameraState === 'unavailable';
  const isRunning = cameraState !== 'off' && !isUnavailable;
  const effectiveImageUrl = snapshotFailed ? undefined : imageUrl;
  const hasVisualBackground = Boolean(streamElement) || Boolean(effectiveImageUrl);
  const showRefreshButton =
    isRunning &&
    !isEditMode &&
    (cameraViewMode === 'snapshot' || isStreamFallback || !isStreamCapable);
  const hasLiveStream = Boolean(streamElement) && !isUnavailable;
  const isFeedRunning = hasLiveStream && streamKind !== 'snapshot';
  const statusLabel = getCameraStatusLabel(t, cameraState, isFeedRunning);
  const motionLabel = motionDetected ? t('camera.motion.detected') : null;
  const statusElapsed = formatElapsedCompact(now, statusChangedAt);
  const motionElapsed = formatElapsedCompact(now, motionChangedAt);
  let streamLabel = isStreamCapable
    ? t('camera.viewer.streamCapable')
    : t('camera.viewer.snapshotOnly');
  if (streamKind === 'snapshot') {
    streamLabel = t('camera.settings.viewMode.snapshot');
  } else if (frontendStreamTypes.length > 0) {
    streamLabel = frontendStreamTypes.join('/').toUpperCase();
  }
  if (streamKind === 'hls') {
    streamLabel = 'HLS';
  } else if (streamKind === 'web_rtc') {
    streamLabel = 'RTC';
  }
  const resolvedStreamLabel = isStreamFallback ? t('camera.viewer.snapshotFallback') : streamLabel;
  const showStreamLabel = Boolean(
    !hideStreamLabel &&
      resolvedStreamLabel &&
      (!isCompact || streamKind === 'snapshot' || isStreamFallback)
  );
  const snapshotFitClassName = fitMode === 'contain' ? 'object-contain' : 'object-cover';
  const overlayButtonClassName = isLightTheme
    ? 'border border-slate-300/80 bg-white/92 text-slate-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-white'
    : 'bg-black/38 text-white/82 backdrop-blur-sm transition-colors hover:bg-black/58 hover:text-white';
  const motionButtonClassName =
    motionDetectionEnabled && !isLightTheme
      ? 'bg-emerald-500/58 hover:bg-emerald-500/75'
      : motionDetectionEnabled
        ? 'border border-emerald-300/80 bg-white/92 text-emerald-700 shadow-sm hover:bg-white'
        : overlayButtonClassName;
  const usesLightOverlayText = !isLightTheme || hasVisualBackground;
  const statusTextClassName = isLightTheme ? surface.textPrimary : 'text-white';
  const statusMutedTextClassName = isLightTheme ? surface.textSecondary : 'text-white/78';
  const statusSubtleTextClassName = isLightTheme ? surface.textMuted : 'text-white/58';
  const motionTextClassName = motionDetected
    ? !isLightTheme && usesLightOverlayText
      ? 'text-emerald-100'
      : 'text-emerald-700'
    : !isLightTheme && usesLightOverlayText
      ? 'text-white/68'
      : surface.textSecondary;
  const titleClassName = usesLightOverlayText
    ? 'leading-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.92)]'
    : `leading-tight ${surface.textPrimary}`;
  const subtitleClassName = usesLightOverlayText
    ? 'text-white/92 drop-shadow-[0_3px_10px_rgba(0,0,0,0.88)]'
    : surface.textSecondary;
  const emptyStateClassName = isLightTheme
    ? 'absolute inset-0 flex flex-col items-center justify-center gap-1'
    : 'absolute inset-0 flex flex-col items-center justify-center gap-1';
  const emptyStateIconClassName = isLightTheme ? 'h-8 w-8 text-slate-400' : 'h-8 w-8 text-zinc-500';
  const emptyStateTextClassName = isLightTheme ? 'text-xs text-slate-500' : 'text-xs text-zinc-500';

  return (
    <div ref={cardRef} className="h-full w-full" data-entity-id={id}>
      <BaseCard
        size={size}
        className="isolate"
        fullBleed
        interactive={!isEditMode}
        frameClassName={isLightTheme ? surface.cardShadow : 'bg-zinc-900'}
        disableDefaultSheen
        role={!isEditMode ? 'button' : undefined}
        tabIndex={!isEditMode ? 0 : undefined}
        onClick={!isEditMode ? onOpenViewer : undefined}
        onKeyDown={
          !isEditMode
            ? (event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenViewer();
                }
              }
            : undefined
        }
        aria-label={!isEditMode ? t('camera.actions.openViewer') : undefined}
        overlay={
          <div className="absolute inset-0 z-0 overflow-hidden">
            {effectiveImageUrl && !hasLiveStream ? (
              <CameraSnapshotImage
                src={effectiveImageUrl}
                sources={imageSources}
                alt={name}
                className={`absolute inset-0 h-full w-full ${snapshotFitClassName}`}
                onError={() => {
                  setSnapshotFailed(true);
                  onImageError();
                }}
              />
            ) : null}

            {hasLiveStream
              ? streamElement
              : !effectiveImageUrl && (
                  <div className={emptyStateClassName}>
                    <Camera className={emptyStateIconClassName} />
                    <span className={emptyStateTextClassName}>
                      {isUnavailable ? t('camera.status.unavailable') : t('camera.status.noSignal')}
                    </span>
                  </div>
                )}
          </div>
        }
        contentClassName="relative z-10 h-full"
      >
        {showRefreshButton && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRefresh();
            }}
            aria-label={t('camera.actions.refreshSnapshot')}
            className={`absolute top-3 left-3 z-30 flex h-8 w-8 items-center justify-center rounded-full ${overlayButtonClassName}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        <div
          className={`absolute top-3 right-3 z-30 inline-flex max-w-[calc(100%-3.75rem)] items-center gap-1.5 text-xs font-medium ${
            !isLightTheme && usesLightOverlayText ? '[text-shadow:0_1px_2px_rgba(0,0,0,0.98)]' : ''
          } ${statusTextClassName}`}
        >
          {!hideStreamStatus ? (
            <>
              <div className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isFeedRunning || cameraState === 'streaming' || cameraState === 'recording'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.72)]'
                      : !isLightTheme && usesLightOverlayText
                        ? 'bg-white/45'
                        : 'bg-slate-400'
                  }`}
                />
                {statusLabel ? <span>{statusLabel}</span> : null}
              </div>
              {statusElapsed ? (
                <span className={statusMutedTextClassName}>{statusElapsed}</span>
              ) : null}
            </>
          ) : null}
          {motionLabel ? (
            <>
              <span className={statusSubtleTextClassName}>/</span>
              <span className={motionTextClassName}>
                {motionLabel}
                {motionElapsed ? <span className="text-current/62"> {motionElapsed}</span> : null}
              </span>
            </>
          ) : null}
          {showStreamLabel ? (
            <>
              <span className={statusSubtleTextClassName}>/</span>
              <span className={`min-w-0 truncate ${statusMutedTextClassName}`}>
                {resolvedStreamLabel}
              </span>
            </>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-10">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <EntityCardHeader
                title={name}
                subtitle={isCompact ? '' : room}
                layout="eyebrow-first"
                size={size}
                titleClassName={titleClassName}
                subtitleClassName={subtitleClassName}
                className="!mb-0 min-w-0"
                contentClassName="text-left"
              />
            </div>

            {!isEditMode && (
              <div className="flex shrink-0 items-center gap-2">
                {motionDetectionEnabled !== null ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleMotionDetection();
                    }}
                    aria-label={
                      motionDetectionEnabled
                        ? t('camera.actions.disableMotionDetection')
                        : t('camera.actions.enableMotionDetection')
                    }
                    className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${motionButtonClassName}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenSettings();
                  }}
                  aria-label={t('camera.actions.openSettings')}
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${overlayButtonClassName}`}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </BaseCard>
    </div>
  );
}
