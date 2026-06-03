import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import {
  type CardSize,
  isExtraSmallCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, memo } from 'react';

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
  const { theme } = useTheme();
  const { t } = useI18n();
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const isExtraSmall = isExtraSmallCardSize(size);
  const headerIcon = (
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
  );

  if (isExtraSmall) {
    return (
      <EntityCardHeader
        title={name}
        subtitle={t('lighting.type.light')}
        compact
        layout="eyebrow-first"
        size={size}
        tone={isOn ? 'primary' : 'neutral'}
        accentColor={activeColor}
        titleClassName={stateSurface.primaryTextClassName}
        subtitleClassName={stateSurface.mutedTextClassName}
        leading={headerIcon}
      />
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
      leading={headerIcon}
    />
  );
});
