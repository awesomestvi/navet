import {
  CardDialogBody,
  CardDialogHeader,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { DialogDoneFooter, DialogShell } from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import {
  BrightnessPresetEditor,
  BrightnessPresets,
  BrightnessSlider,
  ColorSelectorSection,
  ColorTemperatureSection,
  CustomCardTintPicker,
  CustomScrollbar,
  IconPicker,
} from '@navet/app/components/shared/device-editor';
import {
  getAccentDialogSurface,
  resolvePrimaryColorToken,
} from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { PRESET_COLORS } from '@navet/app/constants/light-constants';
import type { BrightnessPresetKey } from '@navet/app/features/lighting/stores/light-preset-store';
import { useI18n, useTheme } from '@navet/app/hooks';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { Palette, Sliders, Star } from 'lucide-react';
import { memo, useState } from 'react';
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
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId) || t('lighting.type.light');
  const [activeTab, setActiveTab] = useState('controls');

  const activeDialogColors = getAccentDialogSurface(resolvePrimaryColorToken(primaryColor));
  const gradientClassName = isOn
    ? `bg-linear-to-br ${activeDialogColors.from} ${activeDialogColors.to} ${activeDialogColors.border}`
    : 'bg-linear-to-br from-gray-900/95 to-gray-950/95 border-gray-500/10';

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${gradientClassName}`}
    >
      <CustomScrollbar isOn={isOn} className="max-sm:min-h-0 max-sm:flex-1">
        <CardDialogBody>
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                {t('common.controls')}
              </CardDialogTabTrigger>
              {supportsBrightness && (
                <CardDialogTabTrigger
                  active={activeTab === 'presets'}
                  icon={Star}
                  onClick={() => setActiveTab('presets')}
                >
                  {t('climate.presets')}
                </CardDialogTabTrigger>
              )}
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                {t('common.customize')}
              </CardDialogTabTrigger>
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-6">
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
            </TabPanel>

            <TabPanel value="card" className="mt-5 space-y-6">
              <CustomCardTintPicker value={tintColor} onChange={onTintColorChange} isOn={isOn} />
              <IconPicker
                selectedIcon={selectedIcon}
                onIconChange={onIconChange}
                isLightOn={isOn}
              />
            </TabPanel>

            {supportsBrightness && (
              <TabPanel value="presets" className="mt-5 space-y-6">
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
              </TabPanel>
            )}
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
});
