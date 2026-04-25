import type { CSSProperties, ReactNode } from 'react';
import { EntityCardTitleBlock } from '@/app/components/primitives/entity-card-title-block';
import {
  type CardSize,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@/app/components/shared/card-size-selector';
import {
  type CardTextTone,
  getCardReadableTextTokens,
} from '@/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';

interface EntityCardHeaderProps {
  title: string;
  subtitle: string;
  size: CardSize;
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
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
}

export function EntityCardHeader({
  title,
  subtitle,
  size,
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
  titleStyle,
  subtitleStyle,
}: EntityCardHeaderProps) {
  const { theme, accentColor: themeAccentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone,
    accentColor: accentColor ?? themeAccentColor,
    baseColor: tone === 'primary' ? (accentColor ?? themeAccentColor) : undefined,
  });
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const isStandardCompact = size === 'small' || size === 'medium' || size === 'medium-vertical';
  const marginBottom =
    marginBottomClassName ??
    (isTiny || isExtraSmall ? 'mb-1' : isStandardCompact ? 'mb-2' : 'mb-2');
  const headerGap = isTiny
    ? 'gap-1.5'
    : isExtraSmall
      ? 'gap-2'
      : isStandardCompact
        ? 'gap-2'
        : 'gap-2';
  const subtitleClassBase =
    layout === 'eyebrow-first'
      ? 'truncate text-[11px] leading-[14px] tracking-normal'
      : 'truncate text-[11px] leading-[14px]';
  const titleClassBase = 'truncate text-[12px] font-semibold leading-[18px]';
  const crossAxisAlignment = align === 'center' ? 'items-center' : 'items-start';

  return (
    <div className={`flex ${crossAxisAlignment} ${headerGap} ${marginBottom} ${className}`}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div
        className={`${isTiny || isExtraSmall ? '' : 'flex min-h-8 items-center'} min-w-0 flex-1 ${contentClassName}`}
      >
        <div
          className={`${isTiny || isExtraSmall ? '' : 'flex h-8 min-w-0 flex-col justify-center overflow-hidden'}`}
        >
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
