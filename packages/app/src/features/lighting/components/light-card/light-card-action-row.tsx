import { CardActionRow } from '@navet/app/components/patterns/card-action-row';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import { BrightnessPresetsInline } from '@navet/app/components/shared/device-editor';
import { useTheme } from '@navet/app/hooks';
import { memo } from 'react';
import { CustomColorTrigger } from './custom-color-trigger';
import { KelvinColorTrigger } from './kelvin-color-trigger';
import type {
  HeaderIconButtonProps,
  LightBrightnessPreset,
  LightEffectOption,
} from './light-card-types';
import { LightEffectPicker } from './light-effect-picker';

interface LightCardActionRowProps {
  size: 'small' | 'medium';
  isOn: boolean;
  currentColor: string;
  colorSwatchColor: string;
  currentTempColor: string;
  isKelvinMode: boolean;
  isColorMode: boolean;
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsColorControl: boolean;
  supportsEffects: boolean;
  brightnessPresets: LightBrightnessPreset[];
  effectOptions: LightEffectOption[];
  brightness: number;
  currentEffect: string | null;
  onKelvinToggle: () => void;
  onColorActivate: () => void;
  onColorChange: (color: string) => void;
  onEffectSelect: (effect: string) => void;
  onBrightnessCommit: (value: number) => void;
  showSettingsButton: boolean;
  settingsButtonProps: HeaderIconButtonProps;
  presetMaxVisible?: number;
  presetOverflow: 'menu' | 'hide';
}

export const LightCardActionRow = memo(function LightCardActionRow({
  size,
  isOn,
  currentColor,
  colorSwatchColor,
  currentTempColor,
  isKelvinMode,
  isColorMode,
  supportsBrightness,
  supportsColorTemperature,
  supportsColorControl,
  supportsEffects,
  brightnessPresets,
  effectOptions,
  brightness,
  currentEffect,
  onKelvinToggle,
  onColorActivate,
  onColorChange,
  onEffectSelect,
  onBrightnessCommit,
  showSettingsButton,
  settingsButtonProps,
  presetMaxVisible,
  presetOverflow,
}: LightCardActionRowProps) {
  const { theme } = useTheme();
  const gapClass = size === 'small' ? 'gap-1.5' : 'gap-2.5';
  const isColorTriggerActive =
    isColorMode ||
    (isOn &&
      supportsColorControl &&
      typeof currentColor === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(currentColor));
  const leftControls = (
    <div className={`flex min-w-0 items-center ${gapClass}`}>
      {supportsColorTemperature && (
        <KelvinColorTrigger
          isOn={isOn}
          currentTempColor={currentTempColor}
          isActive={isKelvinMode}
          onClick={onKelvinToggle}
        />
      )}

      {supportsColorControl && (
        <CustomColorTrigger
          isOn={isOn}
          currentColor={colorSwatchColor || currentColor}
          isActive={isColorTriggerActive}
          onActivate={onColorActivate}
          onColorChange={onColorChange}
        />
      )}

      {supportsEffects && effectOptions.length > 0 && (
        <LightEffectPicker
          currentEffect={currentEffect}
          isOn={isOn}
          onSelect={onEffectSelect}
          options={effectOptions}
          size={size}
          variant="compact"
        />
      )}

      {supportsBrightness && (
        <div className={`flex min-w-0 items-center ${gapClass}`}>
          <BrightnessPresetsInline
            presets={brightnessPresets}
            currentBrightness={brightness}
            isOn={isOn}
            onBrightnessChange={onBrightnessCommit}
            size={size}
            maxVisible={presetMaxVisible}
            overflow={presetOverflow}
            buttonVariant="soft"
          />
        </div>
      )}
    </div>
  );

  return (
    <CardActionRow
      theme={theme}
      size={size}
      leftContent={leftControls}
      rightContent={
        showSettingsButton ? (
          <CardSettingsActionButton
            {...settingsButtonProps}
            theme={theme}
            size={size}
            tone={isOn ? 'default' : 'muted'}
            variant="soft"
          />
        ) : undefined
      }
    />
  );
});
