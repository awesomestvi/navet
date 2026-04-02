import type { ReactNode } from 'react';
import {
  navetRadiusTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';

export interface InlineMessageProps {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Status: in-progress. Shared inline status/message pattern for form and panel feedback.
export function InlineMessage({ tone = 'info', title, children, className }: InlineMessageProps) {
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
