import { type LucideIcon, Settings2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
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
      background: withTintAlpha(accentColor, 0.08),
      hoverBackground: withTintAlpha(accentColor, 0.13),
      border: withTintAlpha(accentColor, 0.22),
      text: accentColor,
      shadow: `inset 0 1px 0 rgba(255,255,255,0.58)`,
    };
  }

  const backgroundAlpha = theme === 'black' ? 0.14 : 0.12;
  const hoverAlpha = theme === 'black' ? 0.2 : 0.18;

  return {
    background: withTintAlpha(accentColor, backgroundAlpha),
    hoverBackground: withTintAlpha(accentColor, hoverAlpha),
    border: withTintAlpha(accentColor, theme === 'black' ? 0.28 : 0.24),
    text: '#ffffff',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
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
      <EntityCardHeaderIcon
        IconComponent={Icon}
        isActive={false}
        size={size}
        baseColor={accentColor}
      />

      <div className={cn('min-w-0', isCompact ? 'max-w-[12rem]' : 'max-w-[16rem]')}>
        <h3
          className={cn(
            'truncate text-[12px] font-semibold leading-[18px] tracking-normal',
            surface.textPrimary
          )}
        >
          {title}
        </h3>
        {!isTiny ? (
          <p
            className={cn(
              'mt-0.5 line-clamp-3 text-[11px] leading-[14px] tracking-normal',
              surface.textMuted
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
          size="compact"
          leading={<ActionIcon className="h-3 w-3" />}
          className={cn(
            'border-[var(--card-empty-action-border)] bg-[var(--card-empty-action-bg)] text-[var(--card-empty-action-text)] hover:bg-[var(--card-empty-action-hover-bg)]',
            'h-7 px-3 text-xs font-semibold',
            isCompact ? 'mt-0.5' : 'mt-1'
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
