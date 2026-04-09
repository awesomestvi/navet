import type { CSSProperties, ReactNode } from 'react';

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
