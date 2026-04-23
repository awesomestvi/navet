import { memo } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { BrightnessPresetsInline } from '@/app/components/shared/device-editor';
import { useTheme } from '@/app/hooks';
import { CustomColorTrigger } from './custom-color-trigger';
import { KelvinColorTrigger } from './kelvin-color-trigger';
import type { HeaderIconButtonProps, LightBrightnessPreset } from './light-card-types';

interface LightCardActionRowProps {
  size: 'small' | 'medium';
  isOn: boolean;
  currentColor: string;
  currentTempColor: string;
  isKelvinMode: boolean;
  supportsColorTemperature: boolean;
  supportsColorControl: boolean;
  brightnessPresets: LightBrightnessPreset[];
  brightness: number;
  onKelvinToggle: () => void;
  onColorChange: (color: string) => void;
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
  currentTempColor,
  isKelvinMode,
  supportsColorTemperature,
  supportsColorControl,
  brightnessPresets,
  brightness,
  onKelvinToggle,
  onColorChange,
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
          size={size}
          onClick={onKelvinToggle}
        />
      )}

      {supportsColorControl && (
        <CustomColorTrigger
          isOn={isOn}
          currentColor={currentColor}
          onColorChange={onColorChange}
          size={size}
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
