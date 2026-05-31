import {
  navetRadiusTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import type { ReactNode } from 'react';

export interface MessageBarProps {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Status: in-progress. Shared inline status/message pattern for form and panel feedback.
export function MessageBar({ tone = 'info', title, children, className }: MessageBarProps) {
  const toneClassName =
    tone === 'success'
      ? navetSemanticColorTokens.success
      : tone === 'warning'
        ? navetSemanticColorTokens.warning
        : tone === 'error'
          ? navetSemanticColorTokens.error
          : navetSemanticColorTokens.info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('border px-4 py-3', navetRadiusTokens.field, toneClassName, className)}
    >
      {title ? <p className={navetTypographyTokens.control}>{title}</p> : null}
      <p className={cn(navetTypographyTokens.body, title ? 'mt-1' : '')}>{children}</p>
    </div>
  );
}
