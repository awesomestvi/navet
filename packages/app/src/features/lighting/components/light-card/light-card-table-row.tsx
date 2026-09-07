import { BrightnessSlider } from '@navet/app/components/shared/device-editor';
import { getEntityIconPillStyles } from '@navet/app/components/shared/theme/entity-icon-pill-styles';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Lightbulb, type LucideIcon } from 'lucide-react';
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
  const { theme, accentColor, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const ToggleIcon = IconComponent ?? Lightbulb;
  const iconPill = getEntityIconPillStyles({
    isActive: isOn,
    isInteractive: false,
    primaryColor,
    accentColor,
    baseColor: activeColor,
    size: 'extra-small',
    theme,
    tone: isOn ? 'primary' : 'neutral',
  });

  return (
    <div
      {...cardInteraction.cardProps}
      className={cn(
        'flex min-h-12 w-full min-w-0 items-center gap-3 py-1 text-left transition-colors motion-reduce:transition-none',
        !isEditMode && 'cursor-pointer rounded-xl',
        !isEditMode && surface.hoverBg
      )}
      data-light-table-row
    >
      <button
        type="button"
        aria-label={iconButtonProps['aria-label']}
        aria-pressed={isOn}
        onClick={iconButtonProps.onClick}
        onPointerDown={iconButtonProps.onPointerDown}
        className={cn(
          '-ml-[5px] flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-75',
          getThemeFocusRingClassName(theme)
        )}
      >
        <span
          className={cn(iconPill.badgeClassName, 'navet-card-header-control-dense')}
          style={iconPill.badgeStyle}
          data-light-row-icon-pill
        >
          {iconText ? (
            <span
              className={cn('text-xs font-semibold', iconPill.iconClassName)}
              style={iconPill.iconStyle}
            >
              {iconText}
            </span>
          ) : (
            <ToggleIcon
              className={iconPill.iconClassName}
              style={iconPill.iconStyle}
              aria-hidden="true"
            />
          )}
        </span>
      </button>

      <span
        className={`-ml-[3px] min-w-0 flex-1 truncate text-sm font-medium ${
          isOn ? surface.textPrimary : surface.textSecondary
        }`}
      >
        {name}
      </span>

      {isOn && supportsBrightness ? (
        <div className="w-20 min-w-16 sm:w-24">
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

      <span className={`w-8 shrink-0 text-right text-xs tabular-nums ${surface.textSecondary}`}>
        {isOn && supportsBrightness ? `${brightness}%` : isOn ? t('common.on') : t('common.off')}
      </span>
    </div>
  );
});
