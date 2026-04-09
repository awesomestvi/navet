import { ChevronDown, Loader2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';

interface RoomEyebrowProps {
  room: string;
  onClick?: () => void;
  isLoading?: boolean;
  /** Force white-muted text for dialogs that always have a dark background regardless of app theme */
  forceDark?: boolean;
  /** Render as a non-interactive div with aria-hidden — use when a select overlay handles interaction */
  visualOnly?: boolean;
  /** Mirror focus state from an overlay element onto the visual ring */
  focused?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function RoomEyebrow({
  room,
  onClick,
  isLoading = false,
  forceDark = false,
  visualOnly = false,
  focused = false,
  className = '',
  style,
}: RoomEyebrowProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const textClassName = forceDark ? 'text-white/52' : surface.textMuted;
  const sharedClassName = `inline-flex items-center gap-1 rounded-full px-0 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${textClassName} ${className}`;
  const content = (
    <>
      {room}
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" />
      )}
    </>
  );

  if (visualOnly) {
    const focusRingClassName = focused
      ? theme === 'light'
        ? 'ring-2 ring-offset-2 ring-gray-400 ring-offset-white'
        : 'ring-2 ring-offset-2 ring-white/30 ring-offset-transparent'
      : '';

    return (
      <div
        aria-hidden="true"
        style={style}
        className={`pointer-events-none rounded-full ${focusRingClassName} ${sharedClassName}`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`transition-opacity hover:opacity-80 ${sharedClassName}`}
    >
      {content}
    </button>
  );
}
