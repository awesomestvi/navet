import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { useI18n } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type { PlatformCameraState } from '@navet/app/platform/provider-feature-models';
import type { CameraViewMode } from '@navet/app/stores/settings-store';
import { Camera, Eye, RefreshCw, Settings2 } from 'lucide-react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { CameraSnapshotImage } from './camera-snapshot-image';
import type { CameraImageSourceKind, CameraStreamType } from './camera-view-mode';

interface CameraCardViewProps {
  id: string;
  name: string;
  room: string;
  cardRef?: RefObject<HTMLDivElement | null>;
  imageUrl: string | undefined;
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
  isStreamCapable: boolean;
  frontendStreamTypes: readonly CameraStreamType[];
  streamKind: CameraImageSourceKind;
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
  cameraState: PlatformCameraState
) {
  if (cameraState === 'unavailable') {
    return t('camera.status.unavailable');
  }

  if (cameraState === 'streaming' || cameraState === 'recording') {
    return t('camera.status.live');
  }

  if (cameraState === 'off') {
    return t('common.off');
  }

  return t('common.on');
}

export function CameraCardView({
  id,
  name,
  room,
  cardRef,
  imageUrl,
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
  isStreamCapable,
  frontendStreamTypes,
  streamKind,
  isStreamFallback,
  onRefresh,
  onImageError,
  onOpenSettings,
  onOpenViewer,
  onToggleMotionDetection,
}: CameraCardViewProps) {
  const { t } = useI18n();
  const isCompact = isCompactCardSize(size);
  const isUnavailable = cameraState === 'unavailable';
  const isRunning = cameraState !== 'off' && !isUnavailable;
  const statusLabel = getCameraStatusLabel(t, cameraState);
  const motionLabel = motionDetected ? t('camera.motion.detected') : t('camera.motion.clear');
  const statusElapsed = formatElapsedCompact(now, statusChangedAt);
  const motionElapsed = formatElapsedCompact(now, motionChangedAt);
  const showRefreshButton =
    isRunning &&
    !isEditMode &&
    (cameraViewMode === 'snapshot' || isStreamFallback || !isStreamCapable);
  const hasLiveStream = Boolean(streamElement) && !isUnavailable;
  let streamLabel = isStreamCapable
    ? t('camera.viewer.streamCapable')
    : t('camera.viewer.snapshotOnly');
  if (streamKind === 'snapshot') {
    streamLabel = t('camera.settings.viewMode.snapshot');
  } else if (frontendStreamTypes.length > 0) {
    streamLabel = frontendStreamTypes.join('/').toUpperCase();
  }
  if (streamKind === 'hls' || streamKind === 'web_rtc') {
    streamLabel = streamKind.toUpperCase();
  }
  const resolvedStreamLabel =
    cameraViewMode === 'snapshot'
      ? null
      : isStreamFallback
        ? t('camera.viewer.snapshotFallback')
        : streamLabel;

  return (
    <div ref={cardRef} className="h-full w-full" data-entity-id={id}>
      <BaseCard
        size={size}
        className="isolate"
        fullBleed
        interactive={!isEditMode}
        frameClassName="bg-zinc-900"
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
            {imageUrl && !hasLiveStream ? (
              <CameraSnapshotImage
                src={imageUrl}
                alt={name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={onImageError}
              />
            ) : null}

            {hasLiveStream
              ? streamElement
              : !imageUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Camera className="h-8 w-8 text-zinc-500" />
                    <span className="text-xs text-zinc-500">
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
            className="absolute top-3 left-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/38 text-white/82 backdrop-blur-sm transition-colors hover:bg-black/58 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        <div className="absolute top-3 right-3 z-30 inline-flex max-w-[calc(100%-3.75rem)] items-center gap-1.5 text-xs font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.98)]">
          <div className="inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                cameraState === 'streaming' || cameraState === 'recording'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.72)]'
                  : 'bg-white/45'
              }`}
            />
            <span>{statusLabel}</span>
          </div>
          {statusElapsed ? <span className="text-white/78">{statusElapsed}</span> : null}
          <span className="text-white/58">/</span>
          <span className={motionDetected ? 'text-emerald-100' : 'text-white/68'}>
            {motionLabel}
            {motionElapsed ? <span className="text-current/62"> {motionElapsed}</span> : null}
          </span>
          {!isCompact && resolvedStreamLabel ? (
            <>
              <span className="text-white/58">/</span>
              <span className="min-w-0 truncate text-white/78">{resolvedStreamLabel}</span>
            </>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/88 via-black/52 to-transparent px-3 pb-3 pt-10">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <EntityCardHeader
                title={name}
                subtitle={isCompact ? '' : room}
                layout="eyebrow-first"
                size={size}
                titleClassName="leading-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.92)]"
                subtitleClassName="text-white/92 drop-shadow-[0_3px_10px_rgba(0,0,0,0.88)]"
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
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-white backdrop-blur-sm transition-colors ${
                      motionDetectionEnabled
                        ? 'bg-emerald-500/58 hover:bg-emerald-500/75'
                        : 'bg-black/38 hover:bg-black/58'
                    }`}
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
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/38 text-white/82 backdrop-blur-sm transition-colors hover:bg-black/58 hover:text-white"
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
