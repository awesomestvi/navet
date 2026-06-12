import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { CSSProperties } from 'react';

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
        size={size}
        tone={isActive ? 'primary' : 'neutral'}
        accentColor={accentColor}
        titleStyle={titleStyle}
        subtitleStyle={subtitleStyle}
        marginBottomClassName="mb-0"
        titleClassName="text-left"
        subtitleClassName="text-left font-normal"
      />
    </div>
  );
}
