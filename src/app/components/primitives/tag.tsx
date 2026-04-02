import type { ReactNode } from 'react';
import {
  navetRadiusTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface TagProps {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
  children: ReactNode;
}

// Status: in-progress. Compact badge/tag primitive for small status labels and metadata chips.
export function Tag({ tone = 'neutral', className, children }: TagProps) {
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
              ? 'border-gray-200 bg-gray-100 text-gray-700'
              : theme === 'black'
                ? 'border-white/16 bg-black text-white'
                : 'border-white/12 bg-white/8 text-white/84'
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
          ? { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44` }
          : undefined
      }
    >
      {children}
    </span>
  );
}
