import { type LucideIcon, Settings2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import {
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';
import { Button } from '../primitives';

export interface CardEmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  size?: CardSize;
  accentColor?: string;
  className?: string;
}

const compactCardSizes = new Set<CardSize>(['tiny', 'extra-small', 'small', 'medium']);

function getActionPalette(theme: ReturnType<typeof useTheme>['theme'], accentColor: string) {
  if (theme === 'light') {
    return {
      background: withTintAlpha(accentColor, 0.12),
      hoverBackground: withTintAlpha(accentColor, 0.18),
      border: withTintAlpha(accentColor, 0.28),
      text: accentColor,
      shadow: `0 12px 24px -20px ${withTintAlpha(accentColor, 0.34)}, inset 0 1px 0 rgba(255,255,255,0.72)`,
    };
  }

  const backgroundAlpha = theme === 'black' ? 0.24 : 0.2;
  const hoverAlpha = theme === 'black' ? 0.32 : 0.28;

  return {
    background: withTintAlpha(accentColor, backgroundAlpha),
    hoverBackground: withTintAlpha(accentColor, hoverAlpha),
    border: withTintAlpha(accentColor, theme === 'black' ? 0.42 : 0.36),
    text: '#ffffff',
    shadow: `0 16px 32px -24px ${withTintAlpha(accentColor, 0.62)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
  };
}

export function CardEmptyState({
  title,
  description,
  icon: Icon = Settings2,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Settings2,
  size = 'medium',
  accentColor: accentColorOverride,
  className,
}: CardEmptyStateProps) {
  const { theme, accentColor: themeAccentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor =
    normalizeCustomCardTint(accentColorOverride) ??
    normalizeCustomCardTint(themeAccentColor) ??
    '#9fb0ff';
  const isCompact = compactCardSizes.has(size);
  const isTiny = size === 'tiny' || size === 'extra-small';
  const hasAction = Boolean(actionLabel && onAction);
  const actionPalette = getActionPalette(theme, accentColor);
  const actionStyle = {
    '--card-empty-action-bg': actionPalette.background,
    '--card-empty-action-hover-bg': actionPalette.hoverBackground,
    '--card-empty-action-border': actionPalette.border,
    '--card-empty-action-text': actionPalette.text,
    boxShadow: actionPalette.shadow,
  } as CSSProperties;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col items-center justify-center text-center',
        isTiny ? 'gap-1.5' : isCompact ? 'gap-2' : 'gap-3',
        className
      )}
    >
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden border',
          surface.border,
          isTiny
            ? 'h-8 w-8 rounded-xl'
            : isCompact
              ? 'h-10 w-10 rounded-2xl'
              : 'h-12 w-12 rounded-[18px]'
        )}
        style={{
          background: `linear-gradient(180deg, ${accentColor}${theme === 'light' ? '1c' : '22'}, transparent 120%)`,
          boxShadow: isTiny
            ? undefined
            : `inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 36px -30px ${accentColor}88`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-br from-white/16 via-white/[0.03] to-transparent"
        />
        <Icon
          className={cn(
            'relative',
            isTiny ? 'h-3.5 w-3.5' : isCompact ? 'h-4 w-4' : 'h-5 w-5',
            surface.textPrimary
          )}
        />
      </div>

      <div className={cn('min-w-0', isCompact ? 'max-w-[14rem]' : 'max-w-[18rem]')}>
        <h3
          className={cn(
            'font-semibold leading-tight tracking-normal',
            surface.textPrimary,
            isTiny ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'
          )}
        >
          {title}
        </h3>
        {!isTiny ? (
          <p
            className={cn(
              'mt-1 leading-snug',
              surface.textSecondary,
              isCompact ? 'text-xs' : 'text-sm'
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {hasAction ? (
        <Button
          type="button"
          variant="secondary"
          size="small"
          leading={<ActionIcon className="h-3.5 w-3.5" />}
          className={cn(
            'border-[var(--card-empty-action-border)] bg-[var(--card-empty-action-bg)] text-[var(--card-empty-action-text)] hover:bg-[var(--card-empty-action-hover-bg)]',
            isCompact ? 'mt-1' : 'mt-2'
          )}
          style={actionStyle}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onAction?.();
          }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
