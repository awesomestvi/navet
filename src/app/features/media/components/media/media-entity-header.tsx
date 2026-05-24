import type { CSSProperties } from 'react';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import type { CardSize } from '@/app/components/shared/card-size-selector';

interface MediaEntityHeaderProps {
  entityName: string;
  entityType: string;
  size: CardSize;
  isActive: boolean;
  accentColor?: string;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
}

export function MediaEntityHeader({
  entityName,
  entityType,
  size,
  isActive,
  accentColor,
  titleStyle,
  subtitleStyle,
}: MediaEntityHeaderProps) {
  return (
    <div className="min-w-0">
      <EntityCardHeader
        title={entityName}
        subtitle={entityType}
        layout="eyebrow-first"
        size={size}
        tone={isActive ? 'primary' : 'neutral'}
        accentColor={accentColor}
        titleStyle={titleStyle}
        subtitleStyle={subtitleStyle}
        marginBottomClassName="mb-0"
        titleClassName="text-left"
        subtitleClassName="text-left font-normal opacity-75"
      />
    </div>
  );
}
