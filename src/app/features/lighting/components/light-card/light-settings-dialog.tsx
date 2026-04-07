import { memo } from 'react';
import {
  CustomDialogDoneButton,
  DialogFooter,
  DialogShell,
} from '@/app/components/primitives/dialog-shell';
import {
  BrightnessPresetEditor,
  BrightnessPresets,
  ColorSelectorSection,
  ColorTemperatureSection,
  CustomScrollbar,
  DialogHeader,
  IconPicker,
} from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { resolvePrimaryColorToken } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { PRESET_COLORS } from '@/app/constants/light-constants';
import { useI18n, useTheme } from '@/app/hooks';
import type { BrightnessPresetKey } from '../../stores/light-preset-store';
import type { LightBrightnessPreset } from './light-card-types';

interface LightSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  room: string;
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
  onTempChange: (temp: number) => void;
  onTempCommit?: (temp: number) => void;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
  onBrightnessChange: (brightness: number) => void;
  applyBrightnessPresetsToAll: boolean;
  onApplyBrightnessPresetsToAllChange: (applyToAll: boolean) => void;
  onBrightnessPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
  onBrightnessPresetOrderChange: (keys: BrightnessPresetKey[]) => void;
  onIconChange: (icon: string) => void;
}

export const LightSettingsDialog = memo(function LightSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  room,
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
  onTempChange,
  onTempCommit,
  onColorChange,
  onCustomColorChange,
  onBrightnessChange,
  applyBrightnessPresetsToAll,
  onApplyBrightnessPresetsToAllChange,
  onBrightnessPresetValueChange,
  onBrightnessPresetOrderChange,
  onIconChange,
}: LightSettingsDialogProps) {
  const { primaryColor, theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const colorMap = {
    orange: { from: 'from-orange-900/95', to: 'to-orange-950/95', border: 'border-orange-500/20' },
    blue: { from: 'from-blue-900/95', to: 'to-blue-950/95', border: 'border-blue-500/20' },
    green: { from: 'from-green-900/95', to: 'to-green-950/95', border: 'border-green-500/20' },
    purple: { from: 'from-purple-900/95', to: 'to-purple-950/95', border: 'border-purple-500/20' },
    pink: { from: 'from-pink-900/95', to: 'to-pink-950/95', border: 'border-pink-500/20' },
    red: { from: 'from-red-900/95', to: 'to-red-950/95', border: 'border-red-500/20' },
    yellow: { from: 'from-yellow-900/95', to: 'to-yellow-950/95', border: 'border-yellow-500/20' },
    teal: { from: 'from-teal-900/95', to: 'to-teal-950/95', border: 'border-teal-500/20' },
  } as const;
  const activeDialogColors = colorMap[resolvePrimaryColorToken(primaryColor)];

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${
        isOn
          ? `bg-gradient-to-br ${activeDialogColors.from} ${activeDialogColors.to} ${activeDialogColors.border}`
          : 'bg-gradient-to-br from-gray-900/95 to-gray-950/95 border-gray-500/10'
      }`}
    >
      <CustomScrollbar isOn={isOn}>
        <div className="p-8">
          <DialogHeader
            title={t('lighting.settings.title')}
            description={`${name} - ${room}`}
            isOn={isOn}
            supportingContent={
              <EntityRoomSelector entityId={entityId} label={t('lighting.settings.room')} compact />
            }
          />

          <div className="space-y-8">
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

            <BrightnessPresets
              presets={brightnessPresets}
              currentBrightness={brightness}
              isOn={isOn}
              onBrightnessChange={onBrightnessChange}
            />

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

            <IconPicker selectedIcon={selectedIcon} onIconChange={onIconChange} isLightOn={isOn} />
          </div>

          <DialogFooter>
            <CustomDialogDoneButton label={t('common.done')} />
          </DialogFooter>
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});
