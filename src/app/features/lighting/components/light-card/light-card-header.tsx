import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, memo } from 'react';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';

interface LightCardHeaderProps {
  name: string;
  isOn: boolean;
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  size: CardSize;
  onIconClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onIconPointerDown?: ButtonHTMLAttributes<HTMLButtonElement>['onPointerDown'];
  iconAriaLabel?: string;
  activeColor?: string | null;
}

export const LightCardHeader = memo(function LightCardHeader({
  name,
  isOn,
  IconComponent,
  iconText,
  size,
  onIconClick,
  onIconPointerDown,
  iconAriaLabel,
  activeColor,
}: LightCardHeaderProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const isExtraSmall = isExtraSmallCardSize(size);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'primary' : 'neutral',
    accentColor,
    baseColor: isOn ? (activeColor ?? accentColor) : undefined,
  });

  if (isExtraSmall) {
    return (
      <div className="mb-1 min-w-0">
        <div
          className={`truncate text-[10px] leading-[12px] ${stateSurface.mutedTextClassName}`}
          style={{ color: textTokens.subtitleColor }}
        >
          {t('lighting.type.light')}
        </div>
        <div
          className={`truncate text-[11px] font-semibold leading-[14px] ${stateSurface.primaryTextClassName}`}
          style={{ color: textTokens.titleColor }}
        >
          {name}
        </div>
      </div>
    );
  }

  return (
    <EntityCardHeader
      title={name}
      subtitle={t('lighting.type.light')}
      layout="eyebrow-first"
      size={size}
      tone={isOn ? 'primary' : 'neutral'}
      accentColor={activeColor}
      titleClassName={stateSurface.primaryTextClassName}
      subtitleClassName={stateSurface.mutedTextClassName}
      leading={
        <EntityCardHeaderIcon
          IconComponent={IconComponent}
          iconText={iconText}
          isActive={isOn}
          size={size}
          tone={isOn ? 'primary' : 'neutral'}
          baseColor={activeColor}
          ariaLabel={iconAriaLabel}
          onClick={onIconClick}
          onPointerDown={onIconPointerDown}
        />
      }
    />
  );
});
