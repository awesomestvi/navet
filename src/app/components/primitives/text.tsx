import type { ReactNode } from 'react';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface TextProps {
  as?: 'p' | 'span' | 'div';
  tone?: 'default' | 'muted' | 'subtle' | 'danger';
  className?: string;
  children: ReactNode;
}

// Status: proposed. Narrow typography primitive for body copy and helper text.
export function Text({ as: Component = 'p', tone = 'default', className, children }: TextProps) {
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
    <Component className={cn(navetTypographyTokens.body, toneClassName, className)}>
      {children}
    </Component>
  );
}
