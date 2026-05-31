import { useDroppable } from '@dnd-kit/core';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { ZoneName } from '../zones/zone-types';

interface ZonePlaceholderProps {
  zone: ZoneName;
  index: number;
}

/**
 * An empty droppable slot shown in edit mode inside each zone band.
 * Accepts any dragged card — dropping here changes the card's zone.
 */
export function ZonePlaceholder({ zone, index }: ZonePlaceholderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `placeholder-${zone}-${index}`,
    data: { zone, type: 'placeholder' },
  });

  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      ref={setNodeRef}
      className={`col-span-1 row-span-2 rounded-2xl border-2 border-dashed transition-colors duration-150 ${
        isOver ? `${surface.border} bg-white/10 opacity-100` : `${surface.borderStrong} opacity-30`
      }`}
    />
  );
}
