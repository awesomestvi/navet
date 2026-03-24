import type { ReactNode } from 'react';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
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
  const isExtraSmall = isExtraSmallCardSize(size);
  const isStandardCompact = size === 'small' || size === 'medium';
  const titleSize = isExtraSmall || isStandardCompact ? 'text-xs' : 'text-sm';
  const marginBottom =
    marginBottomClassName ?? (isExtraSmall ? 'mb-1' : isStandardCompact ? 'mb-2' : 'mb-2');
  const headerGap = isExtraSmall ? 'gap-2' : isStandardCompact ? 'gap-3' : 'gap-3';
  const subtitleMarginTop = 'mt-0';
  const crossAxisAlignment = align === 'center' ? 'items-center' : 'items-start';

  return (
    <div className={`flex ${crossAxisAlignment} ${headerGap} ${marginBottom} ${className}`}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className={`min-w-0 flex-1 ${contentClassName}`}>
        <h3
          className={`truncate font-semibold ${titleSize} ${titleClassName}`}
          style={{ color: textTokens.titleColor }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p
            className={`truncate text-[10px] ${surface.textMuted} ${subtitleMarginTop} ${subtitleClassName}`}
            style={{ color: textTokens.subtitleColor }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
