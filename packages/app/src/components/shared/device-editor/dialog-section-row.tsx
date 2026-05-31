import { CardDialogSection } from '@navet/app/components/patterns';
import { cn } from '@navet/app/components/ui/utils';
import { memo, type ReactNode } from 'react';

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
