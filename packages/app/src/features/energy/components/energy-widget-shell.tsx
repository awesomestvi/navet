import { SectionCard } from '@navet/app/ui-kit/patterns';
import type { ReactNode } from 'react';

interface EnergyWidgetShellProps {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function EnergyWidgetShell({
  title,
  eyebrow,
  action,
  className = '',
  children,
}: EnergyWidgetShellProps) {
  return (
    <SectionCard title={title} eyebrow={eyebrow} action={action} className={className}>
      {children}
    </SectionCard>
  );
}
