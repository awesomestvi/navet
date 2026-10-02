import { type ThemeType, useTheme } from '@navet/app/hooks';
import { CoverPositionFill } from './cover-position-fill';
import { CoverPositionGestureSurface } from './cover-position-gesture-surface';

interface CoverWindowVisualizationProps {
  position: number;
  theme: ThemeType;
  ariaLabel: string;
  onPreviewPosition: (newPosition: number) => void;
  onCommitPosition: (newPosition: number) => void;
  onTap?: () => void;
  disabled?: boolean;
  handleAlignment?: 'center' | 'right';
}

export function CoverWindowVisualization({
  position,
  theme,
  ariaLabel,
  onPreviewPosition,
  onCommitPosition,
  onTap,
  disabled = false,
  handleAlignment = 'right',
}: CoverWindowVisualizationProps) {
  const { colors } = useTheme();
  return (
    <CoverPositionGestureSurface
      position={position}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={`relative h-full min-h-52 w-full max-w-40 overflow-hidden rounded-2xl border outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 ${theme === 'light' ? 'border-slate-300/70' : 'border-white/14'}`}
      onPreviewPosition={onPreviewPosition}
      onCommitPosition={onCommitPosition}
      onTap={onTap}
    >
      <CoverPositionFill
        position={position}
        theme={theme}
        backgroundGradient={colors.cover.closed.gradient}
        coverageGradient={colors.cover.open.gradient}
        showHandle={!disabled}
        handleAlignment={handleAlignment}
      />
    </CoverPositionGestureSurface>
  );
}
