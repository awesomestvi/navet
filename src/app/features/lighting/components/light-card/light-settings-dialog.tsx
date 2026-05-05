import { Palette, Sliders, Star } from 'lucide-react';
import { memo, useState } from 'react';
import {
  CardDialogHeader,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import { DialogDoneFooter, DialogShell } from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import {
  BrightnessPresetEditor,
  BrightnessPresets,
  BrightnessSlider,
  ColorSelectorSection,
  ColorTemperatureSection,
  CustomCardTintPicker,
  CustomScrollbar,
  IconPicker,
} from '@/app/components/shared/device-editor';
import {
  getAccentDialogSurface,
  resolvePrimaryColorToken,
} from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { PRESET_COLORS } from '@/app/constants/light-constants';
import { useI18n, useTheme } from '@/app/hooks';
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';
import type { BrightnessPresetKey } from '../../stores/light-preset-store';
import type { LightBrightnessPreset } from './light-card-types';

interface LightSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isOn: boolean;
  supportsColorTemperature: boolean;
  supportsColorControl: boolean;
  minColorTemp: number;
  maxColorTemp: number;
  tempOptions: Array<{ value: number; color: string; label: string }>;
  brightnessPresets: LightBrightnessPreset[];
  colorTemp: number;
  selectedColor: string | null;
  customColor: string;
  brightness: number;
  selectedIcon: string;
  tintColor: string;
  onTempChange: (temp: number) => void;
  onTempCommit?: (temp: number) => void;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
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
  supportsColorTemperature,
  supportsColorControl,
  minColorTemp,
  maxColorTemp,
  tempOptions,
  brightnessPresets,
  colorTemp,
  selectedColor,
  customColor,
  brightness,
  selectedIcon,
  tintColor,
  onTempChange,
  onTempCommit,
  onColorChange,
  onCustomColorChange,
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
      <CustomScrollbar isOn={isOn}>
        <div className="p-6">
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'presets'}
                icon={Star}
                onClick={() => setActiveTab('presets')}
              >
                Presets
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                Customize
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
              <BrightnessSlider
                value={brightness}
                onChange={onBrightnessChange}
                onCommit={onBrightnessCommit ?? onBrightnessChange}
                isOn={isOn}
                disabled={!isOn}
              />
              <BrightnessPresets
                presets={brightnessPresets}
                currentBrightness={brightness}
                isOn={isOn}
                onBrightnessChange={onBrightnessCommit ?? onBrightnessChange}
              />
            </TabPanel>

            <TabPanel value="card" className="mt-5 space-y-6">
              <CustomCardTintPicker value={tintColor} onChange={onTintColorChange} isOn={isOn} />
              <IconPicker
                selectedIcon={selectedIcon}
                onIconChange={onIconChange}
                isLightOn={isOn}
              />
            </TabPanel>

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
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});
