import type { ReactNode } from 'react';
import { SectionCustomizeButton } from './section-customize-button';

interface SectionCustomizeShellProps {
  isEditMode: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function SectionCustomizeShell({
  isEditMode,
  onToggle,
  children,
  className = 'relative',
  actions,
}: SectionCustomizeShellProps) {
  return (
    <div className={className}>
      <div className="absolute right-0 top-0 z-10 flex items-center gap-2">
        {actions}
        <SectionCustomizeButton isEditMode={isEditMode} onToggle={onToggle} />
      </div>
      {children}
    </div>
  );
}
