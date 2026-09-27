import { BaseCard } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import type { ComponentProps, ReactNode } from 'react';

type SharedBaseCardProps = ComponentProps<typeof BaseCard>;

export interface ChoreBaseCardProps {
  size?: 'small' | 'medium';
  title: string;
  eyebrow: ReactNode;
  leading: ReactNode;
  metrics?: ReactNode;
  instructions?: ReactNode;
  footerLeading?: ReactNode;
  footerAction?: ReactNode;
  surfaceVariant?: SharedBaseCardProps['surfaceVariant'];
  overlay?: SharedBaseCardProps['overlay'];
  style?: SharedBaseCardProps['style'];
  className?: string;
}

/**
 * Canonical task-card composition for Household chores.
 *
 * Keep the fixed reading order intact: context/status, title, optional instructions,
 * then ownership and the task action. Mission and reward cards may reuse this composition
 * while preserving their own semantic icons, metrics, and colour treatment.
 */
export function ChoreBaseCard({
  size = 'medium',
  title,
  eyebrow,
  leading,
  metrics,
  instructions,
  footerLeading,
  footerAction,
  surfaceVariant = 'default',
  overlay,
  style,
  className,
}: ChoreBaseCardProps) {
  const footer =
    footerLeading || footerAction ? (
      <footer className="@container/chore-footer flex min-h-9 min-w-0 items-center justify-between gap-3">
        {footerLeading ? <div className="min-w-0">{footerLeading}</div> : <span />}
        {footerAction ? <div className="shrink-0">{footerAction}</div> : null}
      </footer>
    ) : undefined;

  return (
    <BaseCard
      data-chore-base-card="true"
      data-chore-focus-card="true"
      data-chore-card-size={size}
      size={size}
      surfaceVariant={surfaceVariant}
      style={style}
      overlay={overlay}
      title={title}
      headerTitleOverflow="wrap"
      headerClassName={
        metrics && size === 'medium'
          ? 'flex-wrap [&>div:nth-child(2)]:min-w-32 [&>div:last-child]:ml-auto'
          : undefined
      }
      subtitle={eyebrow}
      headerLeading={leading}
      headerTrailing={
        metrics && size === 'medium' ? (
          <div className="flex items-start gap-1">{metrics}</div>
        ) : undefined
      }
      footer={footer}
      footerClassName={footer ? (size === 'small' ? '!mt-2' : '!mt-3') : undefined}
      contentClassName="flex min-h-0 flex-col"
      className={className}
    >
      <div
        data-chore-instructions="true"
        className={cn('min-h-0 flex-1 px-1', size === 'small' && 'space-y-2')}
      >
        {size === 'small' && metrics ? (
          <div className="flex items-center gap-1">{metrics}</div>
        ) : null}
        {instructions}
      </div>
    </BaseCard>
  );
}
