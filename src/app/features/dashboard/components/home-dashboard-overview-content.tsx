import type { ReactNode } from 'react';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';

export { CardGrid, EmptyCanvas, FlowCanvas } from './home-dashboard-overview-card-grid';
export { HomePresentation, SectionCanvasGrid } from './home-dashboard-overview-sections';

export function ModeChip({
  active,
  icon,
  label,
  onClick,
  surface,
  accentColor,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  accentColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
      style={
        active
          ? {
              borderColor: `${accentColor}55`,
              backgroundColor: `${accentColor}12`,
            }
          : undefined
      }
    >
      {icon}
      <span className={surface.textPrimary}>{label}</span>
    </button>
  );
}
