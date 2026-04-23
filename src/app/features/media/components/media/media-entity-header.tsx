import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import type { CardSize } from '@/app/components/shared/card-size-selector';

interface MediaEntityHeaderProps {
  entityName: string;
  entityType: string;
  size: CardSize;
  isActive: boolean;
  accentColor?: string;
}

export function MediaEntityHeader({
  entityName,
  entityType,
  size,
  isActive,
  accentColor,
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
        marginBottomClassName="mb-0"
        titleClassName="text-left"
        subtitleClassName="text-left"
      />
    </div>
  );
}
