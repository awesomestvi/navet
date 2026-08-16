import { BaseCard } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
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
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const footer =
    footerLeading || footerAction ? (
      <footer className="@container/chore-footer flex min-w-0 items-center justify-between gap-3">
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
      header={
        <div
          data-chore-header="true"
          className={cn('flex min-w-0 items-center gap-2', size === 'small' ? 'mb-2' : 'mb-3')}
        >
          <div className="shrink-0">{leading}</div>
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] grid-rows-[14px_18px] gap-x-2">
            <div
              className={cn(
                'col-start-1 row-start-1 min-w-0 truncate text-[11px] leading-[14px]',
                surface.textMuted
              )}
            >
              {eyebrow}
            </div>
            <h3
              className={cn(
                'col-start-1 row-start-2 truncate text-[12px] font-semibold leading-[18px]',
                surface.textPrimary
              )}
            >
              {title}
            </h3>
            {metrics && size === 'medium' ? (
              <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-start gap-1">
                {metrics}
              </div>
            ) : null}
          </div>
        </div>
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
