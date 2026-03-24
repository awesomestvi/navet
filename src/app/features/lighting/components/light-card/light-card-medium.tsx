import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { BrightnessSlider, KelvinSlider } from '@/app/components/shared/device-editor';
import { LightCardActionRow } from './light-card-action-row';
import { LightCardHeader } from './light-card-header';
import type { HeaderIconButtonProps, LightBrightnessPreset } from './light-card-types';

interface LightCardMediumProps {
  name: string;
  brightness: number;
  currentColor: string;
  colorTemp: number;
  currentTempColor: string;
  minColorTemp: number;
  maxColorTemp: number;
  brightnessPresets: LightBrightnessPreset[];
  isOn: boolean;
  isKelvinMode: boolean;
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  supportsColorControl: boolean;
  supportsColorTemperature: boolean;
  onKelvinToggle: () => void;
  onBrightnessChange: (value: number) => void;
  onBrightnessCommit: (value: number) => void;
  onColorChange: (color: string) => void;
  onTempChange: (temp: number) => void;
  onTempCommit: (temp: number) => void;
  iconButtonProps: HeaderIconButtonProps;
  settingsButtonProps: HeaderIconButtonProps;
  showSettingsButton: boolean;
  showPresetOverflow: boolean;
}

export const LightCardMedium = memo(function LightCardMedium({
  name,
  brightness,
  currentColor,
  colorTemp,
  currentTempColor,
  minColorTemp,
  maxColorTemp,
  brightnessPresets,
  isOn,
  isKelvinMode,
  IconComponent,
  iconText,
  supportsColorControl,
  supportsColorTemperature,
  onKelvinToggle,
  onBrightnessChange,
  onBrightnessCommit,
  onColorChange,
  onTempChange,
  onTempCommit,
  iconButtonProps,
  settingsButtonProps,
  showSettingsButton,
  showPresetOverflow,
}: LightCardMediumProps) {
  return (
    <>
      <LightCardHeader
        name={name}
        isOn={isOn}
        IconComponent={IconComponent}
        iconText={iconText}
        size="medium"
        iconAriaLabel={iconButtonProps['aria-label']}
        onIconClick={iconButtonProps.onClick}
        onIconPointerDown={iconButtonProps.onPointerDown}
      />

      <div className="flex-1 flex flex-col justify-end gap-4">
        {isKelvinMode && supportsColorTemperature ? (
          <KelvinSlider
            value={colorTemp}
            currentTempColor={currentTempColor}
            onChange={onTempChange}
            onCommit={onTempCommit}
            isOn={isOn}
            min={minColorTemp}
            max={maxColorTemp}
            size="medium"
          />
        ) : (
          <BrightnessSlider
            value={brightness}
            onChange={onBrightnessChange}
            onCommit={onBrightnessCommit}
            isOn={isOn}
            size="medium"
          />
        )}

        <LightCardActionRow
          size="medium"
          isOn={isOn}
          currentColor={currentColor}
          currentTempColor={currentTempColor}
          isKelvinMode={isKelvinMode}
          supportsColorTemperature={supportsColorTemperature}
          supportsColorControl={supportsColorControl}
          brightnessPresets={brightnessPresets}
          brightness={brightness}
          onKelvinToggle={onKelvinToggle}
          onColorChange={onColorChange}
          onBrightnessCommit={onBrightnessCommit}
          showSettingsButton={showSettingsButton}
          settingsButtonProps={settingsButtonProps}
          presetMaxVisible={showPresetOverflow ? 3 : undefined}
          presetOverflow={showPresetOverflow ? 'menu' : 'hide'}
        />
      </div>
    </>
  );
});
