import {
  navetRadiusTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import type { ReactNode } from 'react';

export interface BadgeProps {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'default' | 'small';
  className?: string;
  children: ReactNode;
}

// Status: in-progress. Compact metadata badge for wizard states, progress, and inline status text.
export function Badge({ tone = 'neutral', size = 'default', className, children }: BadgeProps) {
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
        size === 'small'
          ? 'inline-flex items-center border px-2 py-0.5'
          : 'inline-flex items-center border px-2.5 py-1',
        navetRadiusTokens.pill,
        size === 'small' ? navetTypographyTokens.compactHelper : navetTypographyTokens.helper,
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
