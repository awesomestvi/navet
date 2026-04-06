import { memo, type ReactNode } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

interface DialogSectionRowProps {
  children: ReactNode;
  className?: string;
  label?: string;
  labelClassName?: string;
}

export const DialogSectionRow = memo(function DialogSectionRow({
  children,
  className = '',
  label,
  labelClassName = '',
}: DialogSectionRowProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={cn('mb-6 min-w-0 last:mb-0', className)}>
      {label ? (
        <div className={cn('mb-2.5 text-sm font-medium', surface.textPrimary, labelClassName)}>
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
});
