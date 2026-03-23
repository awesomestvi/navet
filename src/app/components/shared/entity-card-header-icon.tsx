import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { memo } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getEntityIconPillStyles } from '@/app/components/shared/theme/entity-icon-pill-styles';
import { useTheme } from '@/app/hooks';

interface EntityCardHeaderIconProps {
  IconComponent: LucideIcon;
  isActive: boolean;
  size: CardSize;
  ariaLabel?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onPointerDown?: ButtonHTMLAttributes<HTMLButtonElement>['onPointerDown'];
}

export const EntityCardHeaderIcon = memo(function EntityCardHeaderIcon({
  IconComponent,
  isActive,
  size,
  ariaLabel,
  onClick,
  onPointerDown,
}: EntityCardHeaderIconProps) {
  const { theme, primaryColor } = useTheme();
  const isInteractive = Boolean(onClick);
  const { badgeClassName, badgeStyle, iconClassName, iconStyle } = getEntityIconPillStyles({
    isActive,
    isInteractive,
    primaryColor,
    size,
    theme,
  });

  const icon = <IconComponent aria-hidden="true" className={iconClassName} style={iconStyle} />;

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
