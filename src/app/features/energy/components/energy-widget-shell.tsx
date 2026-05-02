import type { ReactNode } from 'react';
import { SectionCard } from '@/app/ui-kit/patterns';

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
