import type { ReactNode } from 'react';
import {
  type CardSize,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@/app/components/shared/card-size-selector';
import { EntityCardTitleBlock } from '@/app/components/shared/entity-card-title-block';
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
}

export function EntityCardHeader({
  title,
  subtitle,
  size,
  layout = 'title-first',
  leading,
  trailing,
  align = 'start',
  tone = 'neutral',
  titleClassName = '',
  subtitleClassName = '',
  className = '',
  contentClassName = '',
  marginBottomClassName,
}: EntityCardHeaderProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const textTokens = getCardReadableTextTokens({ theme, tone, accentColor });
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const isStandardCompact = size === 'small' || size === 'medium';
  const titleSize = isTiny || isExtraSmall || isStandardCompact ? 'text-xs' : 'text-sm';
  const marginBottom =
    marginBottomClassName ??
    (isTiny || isExtraSmall ? 'mb-1' : isStandardCompact ? 'mb-2' : 'mb-2');
  const headerGap = isTiny
    ? 'gap-1.5'
    : isExtraSmall
      ? 'gap-2'
      : isStandardCompact
        ? 'gap-3'
        : 'gap-3';
  const subtitleClassBase =
    layout === 'eyebrow-first' ? 'truncate text-[10px] tracking-normal' : 'truncate text-[10px]';
  const crossAxisAlignment = align === 'center' ? 'items-center' : 'items-start';

  return (
    <div className={`flex ${crossAxisAlignment} ${headerGap} ${marginBottom} ${className}`}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className={`min-w-0 flex-1 ${contentClassName}`}>
        <EntityCardTitleBlock
          title={title}
          subtitle={subtitle}
          layout={layout}
          titleClassName={`truncate font-semibold ${titleSize} ${titleClassName}`}
          subtitleClassName={`${subtitleClassBase} ${surface.textMuted} ${subtitleClassName}`}
          titleStyle={{ color: textTokens.titleColor }}
          subtitleStyle={{ color: textTokens.subtitleColor }}
        />
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
