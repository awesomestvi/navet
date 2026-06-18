import { BaseCardDialog, type BaseCardDialogTab } from '@navet/app/components/primitives';
import {
  BrightnessPresetEditor,
  BrightnessPresets,
  BrightnessSlider,
  ColorSelectorSection,
  ColorTemperatureSection,
  CustomCardTintPicker,
  IconPicker,
} from '@navet/app/components/shared/device-editor';
import {
  getAccentDialogSurface,
  resolvePrimaryColorToken,
} from '@navet/app/components/shared/theme/theme-colors';
import { PRESET_COLORS } from '@navet/app/constants/light-constants';
import type { BrightnessPresetKey } from '@navet/app/features/lighting/stores/light-preset-store';
import { useI18n, useTheme } from '@navet/app/hooks';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { Palette, Sliders, Star } from 'lucide-react';
import { memo } from 'react';
import type { LightBrightnessPreset, LightEffectOption } from './light-card-types';
import { LightEffectPicker } from './light-effect-picker';

interface LightSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isOn: boolean;
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsColorControl: boolean;
  minColorTemp: number;
  maxColorTemp: number;
  tempOptions: Array<{ value: number; color: string; label: string }>;
  brightnessPresets: LightBrightnessPreset[];
  currentEffect: string | null;
  effectOptions: LightEffectOption[];
  colorTemp: number;
  selectedColor: string | null;
  customColor: string;
  brightness: number;
  selectedIcon: string;
  tintColor: string;
  supportsEffects: boolean;
  onTempChange: (temp: number) => void;
  onTempCommit?: (temp: number) => void;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
  onEffectSelect: (effect: string) => void;
  onBrightnessChange: (brightness: number) => void;
  /** When set, slider drag uses `onBrightnessChange`; release uses this (matches card + HA). */
  onBrightnessCommit?: (brightness: number) => void;
  applyBrightnessPresetsToAll: boolean;
  onApplyBrightnessPresetsToAllChange: (applyToAll: boolean) => void;
  onBrightnessPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
  onBrightnessPresetOrderChange: (keys: BrightnessPresetKey[]) => void;
  onIconChange: (icon: string) => void;
  onTintColorChange: (color: string) => void;
}

export const LightSettingsDialog = memo(function LightSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  isOn,
  supportsBrightness,
  supportsColorTemperature,
  supportsColorControl,
  minColorTemp,
  maxColorTemp,
  tempOptions,
  brightnessPresets,
  currentEffect,
  effectOptions,
  colorTemp,
  selectedColor,
  customColor,
  brightness,
  selectedIcon,
  tintColor,
  supportsEffects,
  onTempChange,
  onTempCommit,
  onColorChange,
  onCustomColorChange,
  onEffectSelect,
  onBrightnessChange,
  onBrightnessCommit,
  applyBrightnessPresetsToAll,
  onApplyBrightnessPresetsToAllChange,
  onBrightnessPresetValueChange,
  onBrightnessPresetOrderChange,
  onIconChange,
  onTintColorChange,
}: LightSettingsDialogProps) {
  const { primaryColor, theme } = useTheme();
  const { t } = useI18n();
  const entityType = getEntityTypeLabel(entityId) || t('lighting.type.light');

  const activeDialogColors = getAccentDialogSurface(resolvePrimaryColorToken(primaryColor));
  const dialogSurface = isOn
    ? {
        panel: `bg-linear-to-br ${activeDialogColors.from} ${activeDialogColors.to}`,
        border: activeDialogColors.border,
      }
    : {
        panel: 'bg-linear-to-br from-gray-900/95 to-gray-950/95',
        border: 'border-gray-500/10',
      };

  const tabs: BaseCardDialogTab[] = [
    {
      key: 'controls',
      label: t('common.controls'),
      icon: Sliders,
      content: (
        <div className="space-y-6">
          {supportsColorTemperature && (
            <ColorTemperatureSection
              colorTemp={colorTemp}
              isOn={isOn}
              minTemp={minColorTemp}
              maxTemp={maxColorTemp}
              tempOptions={tempOptions}
              onTempChange={onTempChange}
              onTempCommit={onTempCommit}
            />
          )}
          {supportsColorControl && (
            <ColorSelectorSection
              colors={Array.from(PRESET_COLORS)}
              selectedColor={selectedColor}
              customColor={customColor}
              isOn={isOn}
              onColorChange={onColorChange}
              onCustomColorChange={onCustomColorChange}
            />
          )}
          {supportsBrightness && (
            <>
              <BrightnessSlider
                value={brightness}
                onChange={onBrightnessChange}
                onCommit={onBrightnessCommit ?? onBrightnessChange}
                isOn={isOn}
                disabled={!isOn}
                presentation="dialog"
              />
              <BrightnessPresets
                presets={brightnessPresets}
                currentBrightness={brightness}
                isOn={isOn}
                onBrightnessChange={onBrightnessCommit ?? onBrightnessChange}
              />
            </>
          )}
          {supportsEffects && effectOptions.length > 0 && (
            <LightEffectPicker
              currentEffect={currentEffect}
              isOn={isOn}
              onSelect={onEffectSelect}
              options={effectOptions}
              variant="dialog"
            />
          )}
        </div>
      ),
    },
    ...(supportsBrightness
      ? [
          {
            key: 'presets',
            label: t('climate.presets'),
            icon: Star,
            content: (
              <div className="space-y-6">
                <BrightnessPresetEditor
                  presets={brightnessPresets}
                  isOn={isOn}
                  onPresetValueChange={onBrightnessPresetValueChange}
                  onPresetOrderChange={onBrightnessPresetOrderChange}
                  onlyApplyToThisLight={!applyBrightnessPresetsToAll}
                  onOnlyApplyToThisLightChange={(checked) =>
                    onApplyBrightnessPresetsToAllChange(!checked)
                  }
                />
              </div>
            ),
          } satisfies BaseCardDialogTab,
        ]
      : []),
    {
      key: 'card',
      label: t('common.customize'),
      icon: Palette,
      content: (
        <div className="space-y-6">
          <CustomCardTintPicker value={tintColor} onChange={onTintColorChange} isOn={isOn} />
          <IconPicker selectedIcon={selectedIcon} onIconChange={onIconChange} isLightOn={isOn} />
        </div>
      ),
    },
  ];

  return (
    <BaseCardDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={name}
      entityId={entityId}
      description={entityType}
      tabs={tabs}
      theme={theme}
      contentSurface={dialogSurface}
      disableOpenAutoFocus
      maxWidth="md"
      height="capped"
      scrollClassName="max-sm:min-h-0 max-sm:flex-1"
    />
  );
});
