import { CardEmptyState } from '@navet/app/ui-kit/patterns';
import { BaseCard } from '@navet/app/ui-kit/primitives';
import type { ComponentProps } from 'react';

export interface EmptyCardProps {
  size: 'small' | 'medium' | 'large';
  title: string;
  description: string;
  icon?: ComponentProps<typeof CardEmptyState>['icon'];
  action?: { label: string; onSelect: () => void };
}

export function EmptyCard({ size, title, description, icon, action }: EmptyCardProps) {
  return (
    <BaseCard size={size}>
      <CardEmptyState
        size={size}
        title={title}
        description={description}
        icon={icon}
        actionLabel={action?.label}
        onAction={action?.onSelect}
      />
    </BaseCard>
  );
}
