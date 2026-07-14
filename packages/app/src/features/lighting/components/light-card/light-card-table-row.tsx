import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { BrightnessSlider } from '@navet/app/components/shared/device-editor';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { memo } from 'react';
import type { LightCardController } from './light-card-controller.types';
import type { HeaderIconButtonProps } from './light-card-types';

interface LightCardTableRowProps {
  name: string;
  isOn: boolean;
  brightness: number;
  supportsBrightness: boolean;
  activeColor?: string | null;
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  iconButtonProps: HeaderIconButtonProps;
  cardInteraction: LightCardController['cardInteraction'];
  onBrightnessChange: (value: number) => void;
  onBrightnessCommit: (value: number) => void;
  isEditMode: boolean;
}

export const LightCardTableRow = memo(function LightCardTableRow({
  name,
  isOn,
  brightness,
  supportsBrightness,
  activeColor,
  IconComponent,
  iconText,
  iconButtonProps,
  cardInteraction,
  onBrightnessChange,
  onBrightnessCommit,
  isEditMode,
}: LightCardTableRowProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      {...cardInteraction.cardProps}
      className={`flex min-h-[52px] w-full min-w-0 items-center gap-2.5 px-2 py-1.5 text-left transition-colors motion-reduce:transition-none ${
        isEditMode ? '' : surface.hoverBg
      }`}
    >
      <EntityCardHeaderIcon
        IconComponent={IconComponent}
        iconText={iconText}
        isActive={isOn}
        size="tiny"
        tone={isOn ? 'primary' : 'neutral'}
        baseColor={activeColor}
        badgeClassName="h-9 w-9"
        glyphClassName="h-[18px] w-[18px]"
        ariaLabel={iconButtonProps['aria-label']}
        onClick={iconButtonProps.onClick}
        onPointerDown={iconButtonProps.onPointerDown}
      />

      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          isOn ? surface.textPrimary : surface.textSecondary
        }`}
      >
        {name}
      </span>

      {isOn && supportsBrightness ? (
        <div className="w-20 min-w-16 sm:w-28">
          <BrightnessSlider
            value={brightness}
            onChange={onBrightnessChange}
            onCommit={onBrightnessCommit}
            isOn
            size="extra-small"
            showLabel={false}
            activeColor={activeColor}
            inverseSurface={false}
          />
        </div>
      ) : null}

      <span className={`w-10 shrink-0 text-right text-xs tabular-nums ${surface.textSecondary}`}>
        {isOn && supportsBrightness ? `${brightness}%` : isOn ? t('common.on') : t('common.off')}
      </span>

      <ChevronRight className={`h-4 w-4 shrink-0 ${surface.textMuted}`} aria-hidden="true" />
    </div>
  );
});
