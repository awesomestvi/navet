import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, memo } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
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
}: LightCardHeaderProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);

  return (
    <EntityCardHeader
      title={name}
      subtitle={t('lighting.type.light')}
      layout="eyebrow-first"
      size={size}
      tone={isOn ? 'primary' : 'neutral'}
      titleClassName={stateSurface.primaryTextClassName}
      subtitleClassName={stateSurface.mutedTextClassName}
      leading={
        <EntityCardHeaderIcon
          IconComponent={IconComponent}
          iconText={iconText}
          isActive={isOn}
          size={size}
          tone={isOn ? 'primary' : 'neutral'}
          ariaLabel={iconAriaLabel}
          onClick={onIconClick}
          onPointerDown={onIconPointerDown}
        />
      }
    />
  );
});
