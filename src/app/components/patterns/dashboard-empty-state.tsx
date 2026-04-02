import { type LucideIcon, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';

export interface DashboardEmptyStateProps {
  title: string;
  description: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  accentColor?: string;
  className?: string;
  compact?: boolean;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  children?: ReactNode;
}

export function DashboardEmptyState({
  title,
  description,
  surface,
  accentColor = '#9fb0ff',
  className,
  compact = false,
  icon: Icon = Wand2,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Wand2,
  children,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border text-center ${surface.border} ${surface.panelMuted} ${compact ? 'p-5' : 'px-6 py-8 md:px-8 md:py-10'} ${surface.cardShadow} ${className ?? ''}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at top left, ${accentColor}22, transparent 34%), radial-gradient(circle at bottom right, ${accentColor}10, transparent 28%)`,
        }}
      />
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-[18px] border ${surface.border}`}
          style={{
            background: `linear-gradient(180deg, ${accentColor}1f, transparent 120%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -28px ${accentColor}66`,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[18px]"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 58%, transparent 100%)',
            }}
          />
          <Icon className={`relative h-5 w-5 ${surface.textPrimary}`} />
        </div>
        <h3 className={`mt-5 text-xl font-semibold tracking-tight ${surface.textPrimary}`}>
          {title}
        </h3>
        <p className={`mt-2 max-w-xl text-sm leading-6 ${surface.textSecondary}`}>{description}</p>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className={`mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
          >
            <ActionIcon className={`h-4 w-4 ${surface.textPrimary}`} />
            <span className={surface.textPrimary}>{actionLabel}</span>
          </button>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}
