import { type LucideIcon, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  getThemeSurfaceTokens,
  type ThemeSurfaceTokens,
} from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';

export interface DashboardEmptyStateProps {
  title: string;
  description: string;
  surface?: ThemeSurfaceTokens;
  accentColor?: string;
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'inline';
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  children?: ReactNode;
}

export function DashboardEmptyState({
  title,
  description,
  surface: surfaceOverride,
  accentColor: accentColorOverride,
  className,
  compact = false,
  variant = 'default',
  icon: Icon = Wand2,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Wand2,
  children,
}: DashboardEmptyStateProps) {
  const { theme, accentColor: themeAccentColor } = useTheme();
  const surface = surfaceOverride ?? getThemeSurfaceTokens(theme);
  const accentColor = accentColorOverride ?? themeAccentColor ?? '#9fb0ff';
  const isInline = variant === 'inline';

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
      <div className={`mx-auto flex flex-col items-center ${isInline ? 'max-w-lg' : 'max-w-2xl'}`}>
        <div
          className={`relative flex items-center justify-center border ${surface.border} ${isInline ? 'h-11 w-11 rounded-2xl' : 'h-14 w-14 rounded-[18px]'}`}
          style={{
            background: `linear-gradient(180deg, ${accentColor}${isInline ? '18' : '1f'}, transparent 120%)`,
            boxShadow: isInline
              ? undefined
              : `inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -28px ${accentColor}66`,
          }}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${isInline ? 'rounded-2xl' : 'rounded-[18px]'}`}
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 58%, transparent 100%)',
            }}
          />
          <Icon
            className={`relative ${isInline ? 'h-4.5 w-4.5' : 'h-5 w-5'} ${surface.textPrimary}`}
          />
        </div>
        <h3
          className={`${isInline ? 'mt-3 text-base' : 'mt-5 text-xl'} font-semibold tracking-tight ${surface.textPrimary}`}
        >
          {title}
        </h3>
        <p
          className={`${isInline ? 'mt-1.5 max-w-md' : 'mt-2 max-w-xl'} text-sm leading-6 ${surface.textSecondary}`}
        >
          {description}
        </p>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className={`${isInline ? 'mt-4 px-3.5 py-2' : 'mt-6 px-4 py-2'} inline-flex items-center gap-2 rounded-full border text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
          >
            <ActionIcon className={`h-4 w-4 ${surface.textPrimary}`} />
            <span className={surface.textPrimary}>{actionLabel}</span>
          </button>
        ) : null}
        {children ? <div className={isInline ? 'mt-3' : 'mt-4'}>{children}</div> : null}
      </div>
    </div>
  );
}
