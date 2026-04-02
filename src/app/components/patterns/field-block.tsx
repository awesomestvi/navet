import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface FieldBlockProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  hintClassName?: string;
  errorClassName?: string;
  children: ReactNode;
}

// Composes field label, help text, and error messaging around a form control.
export function FieldBlock({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  labelClassName,
  hintClassName,
  errorClassName,
  children,
}: FieldBlockProps) {
  const { theme } = useTheme();

  const labelTone =
    theme === 'light' ? 'text-gray-900' : theme === 'black' ? 'text-white' : 'text-white';
  const hintTone =
    theme === 'light'
      ? 'text-gray-500'
      : theme === 'black'
        ? 'text-gray-300'
        : theme === 'glass'
          ? 'text-white/58'
          : 'text-gray-500';

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={cn('block text-sm font-medium', labelTone, labelClassName)}
        >
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p className={cn('text-xs text-red-500', errorClassName)}>{error}</p>
      ) : hint ? (
        <p className={cn('text-xs', hintTone, hintClassName)}>{hint}</p>
      ) : null}
    </div>
  );
}
