import { type LucideIcon, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';

export interface InlineEmptyStateProps {
  title: string;
  description: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  accentColor?: string;
  className?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  children?: ReactNode;
}

export function InlineEmptyState({
  title,
  description,
  surface,
  accentColor = '#9fb0ff',
  className,
  icon: Icon = Wand2,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Wand2,
  children,
}: InlineEmptyStateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border px-5 py-5 text-center ${surface.border} ${surface.panelMuted} ${className ?? ''}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at top left, ${accentColor}18, transparent 32%), radial-gradient(circle at bottom right, ${accentColor}0d, transparent 26%)`,
        }}
      />
      <div className="relative mx-auto flex max-w-lg flex-col items-center">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${surface.border}`}
          style={{ background: `linear-gradient(180deg, ${accentColor}18, transparent 120%)` }}
        >
          <Icon className={`h-4.5 w-4.5 ${surface.textPrimary}`} />
        </div>
        <h3 className={`mt-3 text-base font-semibold tracking-tight ${surface.textPrimary}`}>
          {title}
        </h3>
        <p className={`mt-1.5 max-w-md text-sm leading-6 ${surface.textSecondary}`}>
          {description}
        </p>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
          >
            <ActionIcon className={`h-4 w-4 ${surface.textPrimary}`} />
            <span className={surface.textPrimary}>{actionLabel}</span>
          </button>
        ) : null}
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  );
}
