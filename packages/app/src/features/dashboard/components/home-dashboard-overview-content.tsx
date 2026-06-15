import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import type { ElementType } from 'react';

export { CardGrid, EmptyCanvas, FlowCanvas } from './home-dashboard-overview-card-grid';
export { HomePresentation, SectionCanvasGrid } from './home-dashboard-overview-sections';

export function ModeChip({
  active,
  icon,
  label,
  onClick,
  accentColor,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <InteractivePill
      size="default"
      icon={icon}
      active={active}
      onClick={onClick}
      className="h-8 gap-1 px-3 text-xs leading-5 md:h-10 md:gap-1.5 md:px-4 md:text-sm [&_svg]:h-3.5 [&_svg]:w-3.5 md:[&_svg]:h-4 md:[&_svg]:w-4"
      style={
        active
          ? {
              borderColor: `${accentColor}55`,
              backgroundColor: `${accentColor}12`,
            }
          : undefined
      }
    >
      {label}
    </InteractivePill>
  );
}
