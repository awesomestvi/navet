import { memo, type ReactNode } from 'react';
import { CardDialogSection } from '@/app/components/patterns';
import { cn } from '@/app/components/ui/utils';

interface DialogSectionRowProps {
  children: ReactNode;
  className?: string;
  helperText?: string;
  helperTextClassName?: string;
  label?: string;
  labelClassName?: string;
}

export const DialogSectionRow = memo(function DialogSectionRow({
  children,
  className = '',
  helperText,
  helperTextClassName = '',
  label,
  labelClassName = '',
}: DialogSectionRowProps) {
  return (
    <CardDialogSection
      className={cn(className)}
      helperText={helperText}
      helperTextClassName={helperTextClassName}
      label={label}
      labelClassName={labelClassName}
    >
      {children}
    </CardDialogSection>
  );
});
