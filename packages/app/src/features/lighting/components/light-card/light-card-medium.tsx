import { BrightnessSlider, KelvinSlider } from '@navet/app/components/shared/device-editor';
import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { LightCardActionRow } from './light-card-action-row';
import { LightCardHeader } from './light-card-header';
import type {
  HeaderIconButtonProps,
  LightBrightnessPreset,
  LightEffectOption,
} from './light-card-types';

interface LightCardMediumProps {
  name: string;
  brightness: number;
  currentColor: string;
  colorSwatchColor: string;
  colorTemp: number;
  currentTempColor: string;
  minColorTemp: number;
  maxColorTemp: number;
  brightnessPresets: LightBrightnessPreset[];
  effectOptions: LightEffectOption[];
  isOn: boolean;
  isKelvinMode: boolean;
  isColorMode: boolean;
  currentEffect: string | null;
  activeColor?: string | null;
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  supportsBrightness: boolean;
  supportsEffects: boolean;
  supportsColorControl: boolean;
  supportsColorTemperature: boolean;
  onKelvinToggle: () => void;
  onColorActivate: () => void;
  onBrightnessChange: (value: number) => void;
  onBrightnessCommit: (value: number) => void;
  onColorChange: (color: string) => void;
  onEffectSelect: (effect: string) => void;
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
  colorSwatchColor,
  colorTemp,
  currentTempColor,
  minColorTemp,
  maxColorTemp,
  brightnessPresets,
  effectOptions,
  isOn,
  isKelvinMode,
  isColorMode,
  currentEffect,
  activeColor,
  IconComponent,
  iconText,
  supportsBrightness,
  supportsEffects,
  supportsColorControl,
  supportsColorTemperature,
  onKelvinToggle,
  onColorActivate,
  onBrightnessChange,
  onBrightnessCommit,
  onColorChange,
  onEffectSelect,
  onTempChange,
  onTempCommit,
  iconButtonProps,
  settingsButtonProps,
  showSettingsButton,
  showPresetOverflow,
}: LightCardMediumProps) {
  const inlineControlCount = (supportsColorTemperature ? 1 : 0) + (supportsColorControl ? 1 : 0);

  return (
    <>
      <LightCardHeader
        name={name}
        isOn={isOn}
        IconComponent={IconComponent}
        iconText={iconText}
        size="medium"
        activeColor={activeColor}
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
            activeColor={activeColor}
          />
        ) : supportsBrightness ? (
          <BrightnessSlider
            value={brightness}
            onChange={onBrightnessChange}
            onCommit={onBrightnessCommit}
            isOn={isOn}
            size="medium"
            activeColor={activeColor}
          />
        ) : null}

        <LightCardActionRow
          size="medium"
          isOn={isOn}
          currentColor={currentColor}
          colorSwatchColor={colorSwatchColor}
          currentTempColor={currentTempColor}
          activeColor={activeColor}
          isKelvinMode={isKelvinMode}
          isColorMode={isColorMode}
          supportsBrightness={supportsBrightness}
          supportsColorTemperature={supportsColorTemperature}
          supportsColorControl={supportsColorControl}
          supportsEffects={supportsEffects}
          brightnessPresets={brightnessPresets}
          effectOptions={effectOptions}
          brightness={brightness}
          currentEffect={currentEffect}
          onKelvinToggle={onKelvinToggle}
          onColorActivate={onColorActivate}
          onColorChange={onColorChange}
          onEffectSelect={onEffectSelect}
          onBrightnessCommit={onBrightnessCommit}
          showSettingsButton={showSettingsButton}
          settingsButtonProps={settingsButtonProps}
          presetMaxVisible={showPresetOverflow ? Math.max(0, 3 - inlineControlCount) : undefined}
          presetOverflow={supportsEffects ? 'hide' : showPresetOverflow ? 'menu' : 'hide'}
        />
      </div>
    </>
  );
});
