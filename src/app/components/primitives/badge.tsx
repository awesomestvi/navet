import type { ReactNode } from 'react';
import {
  navetRadiusTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface BadgeProps {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
  children: ReactNode;
}

// Status: in-progress. Compact metadata badge for wizard states, progress, and inline status text.
export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  const { theme, accentColor } = useTheme();

  const toneClassName =
    tone === 'success'
      ? navetSemanticColorTokens.success
      : tone === 'warning'
        ? navetSemanticColorTokens.warning
        : tone === 'danger'
          ? navetSemanticColorTokens.error
          : tone === 'neutral'
            ? theme === 'light'
              ? 'border-gray-200 bg-white text-gray-700'
              : theme === 'black'
                ? 'border-white/16 bg-black text-white'
                : theme === 'glass'
                  ? 'border-white/12 bg-white/10 text-white/84'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-200'
            : 'border-transparent text-white';

  return (
    <span
      className={cn(
        'inline-flex items-center border px-2.5 py-1',
        navetRadiusTokens.pill,
        navetTypographyTokens.helper,
        toneClassName,
        className
      )}
      style={
        tone === 'accent'
          ? { backgroundColor: `${accentColor}1f`, borderColor: `${accentColor}40` }
          : undefined
      }
    >
      {children}
    </span>
  );
}
