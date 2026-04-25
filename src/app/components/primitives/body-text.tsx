import type { ReactNode } from 'react';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface BodyTextProps {
  as?: 'p' | 'span' | 'div';
  tone?: 'default' | 'muted' | 'subtle' | 'danger';
  className?: string;
  children: ReactNode;
}

// Status: proposed. Exact 14/21/400 shared text primitive for compact body copy.
export function BodyText({
  as: Component = 'p',
  tone = 'default',
  className,
  children,
}: BodyTextProps) {
  const { theme } = useTheme();

  const toneClassName =
    tone === 'danger'
      ? 'text-red-500'
      : tone === 'muted'
        ? theme === 'light'
          ? 'text-slate-600'
          : theme === 'black'
            ? 'text-zinc-300'
            : 'text-white/72'
        : tone === 'subtle'
          ? theme === 'light'
            ? 'text-slate-700'
            : theme === 'black'
              ? 'text-zinc-200'
              : 'text-white/84'
          : theme === 'light'
            ? 'text-slate-900'
            : 'text-white';

  return (
    <Component
      className={cn(navetTypographyTokens.bodyCompact, 'font-normal', toneClassName, className)}
    >
      {children}
    </Component>
  );
}
