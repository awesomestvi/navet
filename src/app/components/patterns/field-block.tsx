import type { ReactNode } from 'react';
import { navetSpacingTokens, navetTypographyTokens } from '@/app/components/system/tokens';
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
    theme === 'light' ? 'text-slate-900' : theme === 'black' ? 'text-white' : 'text-white';
  const hintTone =
    theme === 'light'
      ? 'text-slate-600'
      : theme === 'black'
        ? 'text-zinc-300'
        : theme === 'glass'
          ? 'text-white/72'
          : 'text-zinc-400';

  return (
    <div className={cn(navetSpacingTokens.stack.sm, className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={cn('block', navetTypographyTokens.label, labelTone, labelClassName)}
        >
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p className={cn(navetTypographyTokens.helper, 'text-red-500', errorClassName)}>{error}</p>
      ) : hint ? (
        <p className={cn(navetTypographyTokens.helper, hintTone, hintClassName)}>{hint}</p>
      ) : null}
    </div>
  );
}
