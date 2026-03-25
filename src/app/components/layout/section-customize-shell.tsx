import type { ReactNode } from 'react';
import { SectionCustomizeButton } from './section-customize-button';

interface SectionCustomizeShellProps {
  isEditMode: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export function SectionCustomizeShell({
  isEditMode,
  onToggle,
  children,
  className = 'relative',
}: SectionCustomizeShellProps) {
  return (
    <div className={className}>
      <div className="absolute right-0 top-0 z-10">
        <SectionCustomizeButton isEditMode={isEditMode} onToggle={onToggle} />
      </div>
      {children}
    </div>
  );
}
