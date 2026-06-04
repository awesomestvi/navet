import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { CardTextTone } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getEntityIconPillStyles } from '@navet/app/components/shared/theme/entity-icon-pill-styles';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { memo } from 'react';

interface EntityCardHeaderIconProps {
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  isActive: boolean;
  size: CardSize;
  tone?: CardTextTone;
  baseColor?: string | null;
  themeOverride?: ThemeType;
  inverseSurface?: boolean;
  ariaLabel?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onPointerDown?: ButtonHTMLAttributes<HTMLButtonElement>['onPointerDown'];
}

export const EntityCardHeaderIcon = memo(function EntityCardHeaderIcon({
  IconComponent,
  iconText,
  isActive,
  size,
  tone,
  baseColor,
  themeOverride,
  inverseSurface = false,
  ariaLabel,
  onClick,
  onPointerDown,
}: EntityCardHeaderIconProps) {
  const { theme, primaryColor, accentColor } = useTheme();
  const resolvedTheme = themeOverride ?? theme;
  const isInteractive = Boolean(onClick);
  const { badgeClassName, badgeStyle, iconClassName, iconStyle } = getEntityIconPillStyles({
    isActive,
    isInteractive,
    primaryColor,
    accentColor,
    baseColor,
    size,
    theme: resolvedTheme,
    tone,
    inverseSurface,
  });
  const iconTextClassName =
    size === 'large' || size === 'extra-large'
      ? 'text-sm'
      : size === 'tiny'
        ? 'text-xs'
        : size === 'extra-small'
          ? 'text-xs'
          : 'text-sm';

  const icon = IconComponent ? (
    <IconComponent aria-hidden="true" className={iconClassName} style={iconStyle} />
  ) : iconText ? (
    <span
      aria-hidden="true"
      className={`${iconTextClassName} max-w-full overflow-hidden text-ellipsis whitespace-nowrap leading-none`}
      style={iconStyle}
    >
      {iconText}
    </span>
  ) : null;

  if (!isInteractive) {
    return (
      <div className={badgeClassName} style={badgeStyle}>
        {icon}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={badgeClassName}
      style={badgeStyle}
    >
      {icon}
    </button>
  );
});
