import { Camera, RefreshCw, Settings2 } from 'lucide-react';
import { BaseCard } from '@/app/components/primitives';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';

interface CameraCardViewProps {
  id: string;
  name: string;
  room: string;
  snapshotUrl: string | undefined;
  isUnavailable: boolean;
  isRunning: boolean;
  statusChangedAt: number | null;
  motionDetected: boolean;
  motionChangedAt: number | null;
  now: number;
  size: CardSize;
  isEditMode: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
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

export function CameraCardView({
  id,
  name,
  room,
  snapshotUrl,
  isUnavailable,
  isRunning,
  statusChangedAt,
  motionDetected,
  motionChangedAt,
  now,
  size,
  isEditMode,
  onRefresh,
  onOpenSettings,
}: CameraCardViewProps) {
  const { t } = useI18n();
  const isCompact = isCompactCardSize(size);
  const statusLabel = isUnavailable
    ? t('camera.status.unavailable')
    : isRunning
      ? t('camera.status.live')
      : t('common.off');
  const motionLabel = motionDetected ? t('camera.motion.detected') : t('camera.motion.clear');
  const statusElapsed = formatElapsedCompact(now, statusChangedAt);
  const motionElapsed = formatElapsedCompact(now, motionChangedAt);

  return (
    <BaseCard
      size={size}
      fullBleed
      frameClassName="bg-zinc-900"
      data-entity-id={id}
      disableDefaultSheen
      overlay={
        snapshotUrl && !isUnavailable ? (
          <img
            src={snapshotUrl}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Camera className="h-8 w-8 text-zinc-500" />
            <span className="text-xs text-zinc-500">
              {isUnavailable ? t('camera.status.unavailable') : t('camera.status.noSignal')}
            </span>
          </div>
        )
      }
      contentClassName="h-full"
    >
      {/* Refresh button (top-left, only when live and not in edit mode) */}
      {isRunning && !isEditMode && (
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t('camera.actions.refreshSnapshot')}
          className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          <span
            className={`h-2 w-2 rounded-full ${isRunning ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 'bg-white/45'}`}
          />
          <span>{statusLabel}</span>
          {statusElapsed ? <span className="text-white/78">{statusElapsed}</span> : null}
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/72 to-transparent px-3 pb-3 pt-10">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <EntityCardHeader
              title={name}
              subtitle={isCompact ? '' : room}
              layout="eyebrow-first"
              size={size}
              titleClassName="leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
              subtitleClassName="text-white/88 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              className="mb-0 min-w-0"
              contentClassName="text-left"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium backdrop-blur-sm ${
                  motionDetected
                    ? 'border-emerald-400/35 bg-emerald-400/16 text-emerald-50'
                    : 'border-white/12 bg-black/35 text-white/78'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    motionDetected ? 'bg-emerald-300' : 'bg-white/40'
                  }`}
                />
                <span>{motionLabel}</span>
                {motionElapsed ? <span className="text-current/70">{motionElapsed}</span> : null}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!isEditMode && (
            <div className="flex shrink-0 items-center gap-2">
              {/* Settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={t('camera.actions.openSettings')}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </BaseCard>
  );
}
