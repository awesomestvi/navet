import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import {
  type CardSize,
  isExtraSmallCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, memo, type ReactNode } from 'react';
import { formatLightEffectLabel } from './light-card-effect-utils';

interface LightCardHeaderProps {
  name: string;
  isOn: boolean;
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  currentEffect?: string | null;
  size: CardSize;
  onIconClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onIconPointerDown?: ButtonHTMLAttributes<HTMLButtonElement>['onPointerDown'];
  iconAriaLabel?: string;
  activeColor?: string | null;
  themeOverride?: ThemeType;
  trailing?: ReactNode;
}

export const LightCardHeader = memo(function LightCardHeader({
  name,
  isOn,
  IconComponent,
  iconText,
  currentEffect,
  size,
  onIconClick,
  onIconPointerDown,
  iconAriaLabel,
  activeColor,
  themeOverride,
  trailing,
}: LightCardHeaderProps) {
  const { theme: activeTheme, accentColor } = useTheme();
  const { t } = useI18n();
  const theme = themeOverride ?? activeTheme;
  const effectiveTheme = theme === 'light' && isOn ? 'dark' : theme;
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const useInverseForeground = theme === 'light' && isOn;
  const readable = getCardReadableTextTokens({
    theme,
    tone: 'primary',
    baseColor: activeColor ?? accentColor,
    backgroundColor: activeColor ?? accentColor,
  });
  const isExtraSmall = isExtraSmallCardSize(size);
  const cardType = t('lighting.type.light');
  const subtitle = currentEffect
    ? `${cardType} · ${formatLightEffectLabel(currentEffect)}`
    : cardType;
  const headerIcon = (
    <EntityCardHeaderIcon
      IconComponent={IconComponent}
      iconText={iconText}
      isActive={isOn}
      size={isExtraSmall ? 'tiny' : size}
      tone={isOn ? 'primary' : 'neutral'}
      baseColor={activeColor}
      themeOverride={effectiveTheme}
      inverseSurface={useInverseForeground}
      ariaLabel={iconAriaLabel}
      onClick={onIconClick}
      onPointerDown={onIconPointerDown}
    />
  );

  if (isExtraSmall) {
    return (
      <EntityCardHeader
        title={name}
        subtitle={subtitle}
        compact
        layout="eyebrow-first"
        size={size}
        tone={isOn ? 'primary' : 'neutral'}
        accentColor={activeColor}
        titleClassName={stateSurface.primaryTextClassName}
        subtitleClassName={stateSurface.mutedTextClassName}
        titleStyle={useInverseForeground ? { color: readable.titleColor } : undefined}
        subtitleStyle={useInverseForeground ? { color: readable.subtitleColor } : undefined}
        leading={headerIcon}
        trailing={trailing}
      />
    );
  }

  return (
    <EntityCardHeader
      title={name}
      subtitle={subtitle}
      layout="eyebrow-first"
      size={size}
      tone={isOn ? 'primary' : 'neutral'}
      accentColor={activeColor}
      titleClassName={stateSurface.primaryTextClassName}
      subtitleClassName={stateSurface.mutedTextClassName}
      titleStyle={useInverseForeground ? { color: readable.titleColor } : undefined}
      subtitleStyle={useInverseForeground ? { color: readable.subtitleColor } : undefined}
      leading={headerIcon}
    />
  );
});
