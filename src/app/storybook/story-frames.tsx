import type { CSSProperties, ReactNode } from 'react';
import { type CardSize, cardSizeOverlayClass } from '@/app/components/shared/card-size-selector';

// ---------------------------------------------------------------------------
// EntityCardStoryFrame
// Shared story utility — sizes a card story to the standard dashboard grid
// cell dimensions. Used across all entity card stories.
// ---------------------------------------------------------------------------

export function EntityCardStoryFrame({
  children,
  className,
  size = 'medium',
}: {
  children: ReactNode;
  className?: string;
  size?: CardSize;
}) {
  return <div className={className ?? getEntityCardStoryFrameClassName(size)}>{children}</div>;
}

export function noopCardSizeChange() {
  return;
}

export function getEntityCardStoryFrameClassName(size: CardSize) {
  return cardSizeOverlayClass[size];
}

// ---------------------------------------------------------------------------
// SettingsDialogStoryFrame
// Shared story utility — provides a dark card backdrop for settings dialog
// stories so dialogs render in a realistic context.
// ---------------------------------------------------------------------------

interface SettingsDialogStoryFrameProps {
  children: ReactNode;
  parentCardClassName?: string;
  parentCardStyle?: CSSProperties;
  showParentCard?: boolean;
}

export function SettingsDialogStoryFrame({
  children,
  parentCardClassName,
  parentCardStyle,
  showParentCard = false,
}: SettingsDialogStoryFrameProps) {
  return (
    <div className="relative min-h-[34rem] overflow-hidden rounded-[28px] bg-[#07090f]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_35%,rgba(2,6,23,0.72))]" />

      {showParentCard ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
          <div
            className={`h-[18rem] w-[22rem] rounded-[30px] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl ${parentCardClassName ?? 'bg-white/10'}`}
            style={parentCardStyle}
          />
        </div>
      ) : null}

      <div className="relative min-h-[34rem]">{children}</div>
    </div>
  );
}
