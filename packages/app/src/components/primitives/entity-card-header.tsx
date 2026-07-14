import { EntityCardTitleBlock } from '@navet/app/components/primitives/entity-card-title-block';
import {
  type CardSize,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@navet/app/components/shared/card-size-selector';
import {
  type CardTextTone,
  getCardReadableTextTokens,
} from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { CSSProperties, ReactNode } from 'react';

export type EntityCardHeaderVariant = 'default' | 'large';

interface EntityCardHeaderProps {
  title: string;
  subtitle: string;
  size: CardSize;
  compact?: boolean;
  layout?: 'title-first' | 'eyebrow-first';
  leading?: ReactNode;
  trailing?: ReactNode;
  align?: 'start' | 'center';
  tone?: CardTextTone;
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
  contentClassName?: string;
  marginBottomClassName?: string;
  accentColor?: string | null;
  backgroundColor?: string | null;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
  variant?: EntityCardHeaderVariant;
}

export function EntityCardHeader({
  title,
  subtitle,
  size,
  compact = false,
  layout = 'eyebrow-first',
  leading,
  trailing,
  align = 'start',
  tone = 'neutral',
  titleClassName = '',
  subtitleClassName = '',
  className = '',
  contentClassName = '',
  marginBottomClassName,
  accentColor,
  backgroundColor,
  titleStyle,
  subtitleStyle,
  variant = 'default',
}: EntityCardHeaderProps) {
  const { theme, accentColor: themeAccentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone,
    accentColor: accentColor ?? themeAccentColor,
    baseColor: tone === 'primary' ? (accentColor ?? themeAccentColor) : undefined,
    backgroundColor,
  });
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const useCompactLayout = compact && !isTiny;
  const useLargeVariant = variant === 'large';
  const isStandardCompact = size === 'small' || size === 'medium' || size === 'medium-vertical';
  const marginBottom =
    marginBottomClassName ??
    (useLargeVariant
      ? 'mb-3'
      : isTiny || isExtraSmall || useCompactLayout
        ? 'mb-1'
        : isStandardCompact
          ? 'mb-2'
          : 'mb-2');
  const headerGap = useLargeVariant ? 'gap-3' : isTiny || useCompactLayout ? 'gap-1.5' : 'gap-2';
  const subtitleClassBase = useLargeVariant
    ? 'truncate text-[11px] leading-[15px] tracking-normal'
    : useCompactLayout
      ? 'truncate text-[10px] leading-[12px] tracking-normal'
      : layout === 'eyebrow-first'
        ? 'truncate text-[11px] leading-[14px] tracking-normal'
        : 'truncate text-[11px] leading-[14px]';
  const titleClassBase = useLargeVariant
    ? 'truncate text-[14px] font-semibold leading-[18px]'
    : useCompactLayout
      ? 'truncate text-[11px] font-semibold leading-[13px]'
      : 'truncate text-[12px] font-semibold leading-[18px]';
  const crossAxisAlignment = align === 'center' || useLargeVariant ? 'items-center' : 'items-start';
  const contentFrameClassName = useLargeVariant
    ? 'flex min-h-10 items-center'
    : isTiny || isExtraSmall || useCompactLayout
      ? ''
      : 'flex min-h-8 items-center';
  const titleStackClassName = useLargeVariant
    ? 'flex min-h-10 min-w-0 flex-col justify-center overflow-hidden'
    : isTiny || isExtraSmall || useCompactLayout
      ? ''
      : 'flex h-8 min-w-0 flex-col justify-center overflow-hidden';

  return (
    <div className={`flex ${crossAxisAlignment} ${headerGap} ${marginBottom} ${className}`}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div
        className={`${contentFrameClassName} min-w-0 flex-1 overflow-hidden ${contentClassName}`}
      >
        <div className={`${titleStackClassName} min-w-0`}>
          <EntityCardTitleBlock
            title={title}
            subtitle={subtitle}
            layout={layout}
            titleClassName={`${titleClassBase} ${titleClassName}`}
            subtitleClassName={`${subtitleClassBase} ${surface.textMuted} ${subtitleClassName}`}
            titleStyle={titleStyle ?? { color: textTokens.titleColor }}
            subtitleStyle={subtitleStyle ?? { color: textTokens.subtitleColor }}
          />
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
