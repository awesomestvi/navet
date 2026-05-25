import { memo } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { BrightnessPresetsInline } from '@/app/components/shared/device-editor';
import { useTheme } from '@/app/hooks';
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
          isActive={isColorMode}
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
