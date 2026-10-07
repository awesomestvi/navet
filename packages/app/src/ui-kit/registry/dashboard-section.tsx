import { SectionCard } from '@navet/app/ui-kit/patterns';
import { BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { ReactNode } from 'react';

export interface DashboardSectionProps {
  title: string;
  state: 'populated' | 'empty' | 'unavailable';
  emptyLabel: string;
  unavailableLabel: string;
  children: ReactNode;
  action?: { label: string; onSelect: () => void; disabled?: boolean };
}
export function DashboardSection({
  title,
  state,
  emptyLabel,
  unavailableLabel,
  children,
  action,
}: DashboardSectionProps) {
  return (
    <SectionCard
      title={title}
      action={
        action ? (
          <Button
            variant="soft"
            disabled={action.disabled || state === 'unavailable'}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        ) : undefined
      }
    >
      {state === 'populated' ? (
        children
      ) : (
        <div role="status">
          <BodyText>{state === 'empty' ? emptyLabel : unavailableLabel}</BodyText>
        </div>
      )}
    </SectionCard>
  );
}
