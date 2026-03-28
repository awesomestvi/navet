import * as Popover from '@radix-ui/react-popover';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { type MouseEvent, memo, useCallback } from 'react';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { getCardActionControlSizes } from '../card-action-control-sizes';
import type { CardSize } from '../card-size-selector';
import { getRoundControlStyles } from '../theme/round-control-styles';
import {
  getBrightnessPresetAccentColor,
  getBrightnessPresetSelectedStyle,
} from './brightness-preset-styles';

interface BrightnessPreset {
  icon: LucideIcon;
  brightness: number;
  key?: string;
  label: string;
}

interface BrightnessPresetsInlineProps {
  presets: BrightnessPreset[];
  currentBrightness: number;
  isOn: boolean;
  onBrightnessChange: (brightness: number) => void;
  size?: CardSize;
  maxVisible?: number;
  overflow?: 'hide' | 'menu';
  buttonVariant?: 'neutral' | 'soft';
}

export const BrightnessPresetsInline = memo(function BrightnessPresetsInline({
  presets,
  currentBrightness,
  isOn,
  onBrightnessChange,
  size = 'medium',
  maxVisible,
  overflow = 'hide',
  buttonVariant = 'neutral',
}: BrightnessPresetsInlineProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const isCompact = isCompactCardSize(size);
  const controlSizes = getCardActionControlSizes(
    isCompact ? 'small' : size === 'large' ? 'large' : 'medium'
  );
  const buttonSize = controlSizes.button;
  const iconSize = controlSizes.icon;
  const roundControl = getRoundControlStyles(theme);
  const gap = size === 'large' ? 'gap-2' : 'gap-1.5';
  const visiblePresets = maxVisible !== undefined ? presets.slice(0, maxVisible) : presets;
  const overflowPresets = maxVisible !== undefined ? presets.slice(maxVisible) : [];
  const activeColor = getBrightnessPresetAccentColor(primaryColor);
  const selectedClasses = roundControl.selectedText;
  const disabledSelectedClasses = 'cursor-not-allowed text-white opacity-70';
  const unselectedClasses =
    buttonVariant === 'soft' ? roundControl.softButton : roundControl.defaultButton;
  const disabledUnselectedClasses =
    buttonVariant === 'soft' ? roundControl.softDisabledButton : roundControl.disabledButton;

  const handlePresetButtonClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const brightness = Number(e.currentTarget.dataset.brightness);
      if (!Number.isNaN(brightness)) onBrightnessChange(brightness);
    },
    [onBrightnessChange]
  );

  return (
    <fieldset
      data-card-interactive
      className={`shrink-0 flex items-center self-center ${gap}`}
      aria-label={t('deviceEditor.brightnessPresets')}
    >
      {visiblePresets.map((preset) => {
        const IconComponent = preset.icon;
        const isSelected = Math.abs(currentBrightness - preset.brightness) <= 2;

        return (
          <button
            type="button"
            key={preset.key ?? preset.brightness}
            data-brightness={preset.brightness}
            disabled={!isOn}
            aria-label={t('deviceEditor.brightnessPresetAria', {
              label: preset.label,
              brightness: preset.brightness,
            })}
            aria-pressed={isSelected}
            onClick={handlePresetButtonClick}
            style={
              isSelected ? getBrightnessPresetSelectedStyle(theme, activeColor, isOn) : undefined
            }
            className={`${buttonSize} rounded-full transition-all duration-300 flex items-center justify-center ${
              !isOn
                ? isSelected
                  ? disabledSelectedClasses
                  : disabledUnselectedClasses
                : isSelected
                  ? selectedClasses
                  : `${unselectedClasses} cursor-pointer hover:scale-105 active:scale-95`
            }`}
          >
            <IconComponent className={iconSize} aria-hidden="true" />
          </button>
        );
      })}
      {overflow === 'menu' && overflowPresets.length > 0 && (
        <BrightnessOverflowMenu
          presets={overflowPresets}
          currentBrightness={currentBrightness}
          isOn={isOn}
          onBrightnessChange={onBrightnessChange}
          buttonSize={buttonSize}
          iconSize={iconSize}
          buttonVariant={buttonVariant}
        />
      )}
    </fieldset>
  );
});

interface BrightnessOverflowMenuProps {
  presets: BrightnessPreset[];
  currentBrightness: number;
  isOn: boolean;
  onBrightnessChange: (brightness: number) => void;
  buttonSize: string;
  iconSize: string;
  buttonVariant: 'neutral' | 'soft';
}

const BrightnessOverflowMenu = memo(function BrightnessOverflowMenu({
  presets,
  currentBrightness,
  isOn,
  onBrightnessChange,
  buttonSize,
  iconSize,
  buttonVariant,
}: BrightnessOverflowMenuProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const activeColor = getBrightnessPresetAccentColor(primaryColor);
  const roundControl = getRoundControlStyles(theme);
  const selectedClasses = roundControl.selectedText;
  const unselectedClasses =
    buttonVariant === 'soft' ? roundControl.softButton : roundControl.defaultButton;
  const disabledTriggerClasses =
    buttonVariant === 'soft' ? roundControl.softDisabledButton : roundControl.disabledButton;

  const handleOverflowButtonClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const brightness = Number(e.currentTarget.dataset.brightness);
      if (!Number.isNaN(brightness)) onBrightnessChange(brightness);
    },
    [onBrightnessChange]
  );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={!isOn}
          aria-label={t('deviceEditor.moreBrightnessPresets')}
          className={`${buttonSize} rounded-full transition-all duration-300 flex items-center justify-center ${
            !isOn
              ? disabledTriggerClasses
              : `cursor-pointer ${unselectedClasses} hover:scale-105 active:scale-95`
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className={iconSize} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          align="start"
          className={`z-50 rounded-2xl border p-3 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-200 ${surface.panel} ${surface.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <fieldset
            className="flex items-center gap-2"
            aria-label={t('deviceEditor.moreBrightnessPresets')}
          >
            {presets.map((preset) => {
              const IconComponent = preset.icon;
              const isSelected = Math.abs(currentBrightness - preset.brightness) <= 2;

              return (
                <button
                  type="button"
                  key={preset.key ?? preset.brightness}
                  data-brightness={preset.brightness}
                  aria-label={t('deviceEditor.brightnessPresetAria', {
                    label: preset.label,
                    brightness: preset.brightness,
                  })}
                  aria-pressed={isSelected}
                  onClick={handleOverflowButtonClick}
                  style={
                    isSelected
                      ? getBrightnessPresetSelectedStyle(theme, activeColor, true)
                      : undefined
                  }
                  className={`${buttonSize} rounded-full transition-all duration-300 flex items-center justify-center ${
                    isSelected ? selectedClasses : unselectedClasses
                  } cursor-pointer hover:scale-105 active:scale-95`}
                >
                  <IconComponent className={iconSize} aria-hidden="true" />
                </button>
              );
            })}
          </fieldset>
          <Popover.Arrow className={theme === 'light' ? 'fill-white' : 'fill-zinc-900'} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
