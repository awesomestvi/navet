import { Camera, Power, RefreshCw, Settings2 } from 'lucide-react';
import {
  type CardSize,
  CardSizeSelector,
  isCompactCardSize,
} from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';

interface CameraCardViewProps {
  id: string;
  name: string;
  room: string;
  snapshotUrl: string | undefined;
  isUnavailable: boolean;
  isOff: boolean;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRefresh: () => void;
  onTogglePower: () => void;
  onOpenSettings: () => void;
}

export function CameraCardView({
  id,
  name,
  room,
  snapshotUrl,
  isUnavailable,
  isOff,
  size,
  onSizeChange,
  isEditMode,
  onRefresh,
  onTogglePower,
  onOpenSettings,
}: CameraCardViewProps) {
  const isCompact = isCompactCardSize(size);

  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-zinc-900" data-entity-id={id}>
      {/* Snapshot image */}
      {snapshotUrl && !isUnavailable ? (
        <img
          src={snapshotUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        /* Unavailable / no image placeholder */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="h-8 w-8 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            {isUnavailable ? 'Unavailable' : 'No signal'}
          </span>
        </div>
      )}

      {/* Size selector (top-right, always visible so cameras can be resized from any view) */}
      <div className="absolute right-2 top-2 z-20">
        <CardSizeSelector
          currentSize={size}
          onSizeChange={(newSize) => onSizeChange(id, newSize)}
          triggerSize={size}
        />
      </div>

      {/* Refresh button (top-left, only when live and not in edit mode) */}
      {!isOff && !isEditMode && (
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh camera snapshot"
          className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
        <div className="flex items-end justify-between gap-2">
          <EntityCardHeader
            title={name}
            subtitle={isCompact ? '' : room}
            size={size}
            titleClassName="text-white leading-tight"
            subtitleClassName="text-zinc-300"
            className="mb-0 min-w-0 flex-1"
            contentClassName="text-left"
          />

          {/* Action buttons */}
          {!isEditMode && (
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Power toggle */}
              <button
                type="button"
                onClick={onTogglePower}
                aria-label={isOff ? 'Turn camera on' : 'Turn camera off'}
                className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                  isOff
                    ? 'bg-white/20 text-white/60 hover:bg-white/30'
                    : 'bg-blue-500/80 text-white hover:bg-blue-500'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Camera settings"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
