import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
import { BrightnessSlider, KelvinSlider } from '@/app/components/shared/device-editor';
import { useTheme } from '@/app/hooks';
import { LightCardActionRow } from './light-card-action-row';
import { LightCardHeader } from './light-card-header';
import type {
  HeaderIconButtonProps,
  LightBrightnessPreset,
  LightEffectOption,
} from './light-card-types';

interface LightCardSmallProps {
  name: string;
  room: string;
  size: CardSize;
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
}

export const LightCardSmall = memo(function LightCardSmall({
  name,
  size,
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
}: LightCardSmallProps) {
  const { theme } = useTheme();
  const isExtraSmall = isExtraSmallCardSize(size);
  const inlineControlCount = (supportsColorTemperature ? 1 : 0) + (supportsColorControl ? 1 : 0);
  const hasInlineControls = inlineControlCount > 0;
  // When effects are available, the overflow affordance becomes the effect picker.
  const presetMaxVisible = hasInlineControls ? Math.max(0, 2 - inlineControlCount) : undefined;
  const presetOverflow: 'menu' | 'hide' = supportsEffects
    ? 'hide'
    : hasInlineControls
      ? 'menu'
      : 'hide';

  return (
    <>
      <LightCardHeader
        name={name}
        isOn={isOn}
        IconComponent={IconComponent}
        iconText={iconText}
        size={size}
        activeColor={activeColor}
        iconAriaLabel={iconButtonProps['aria-label']}
        onIconClick={iconButtonProps.onClick}
        onIconPointerDown={iconButtonProps.onPointerDown}
      />

      <div
        className={`flex-1 flex flex-col ${isExtraSmall ? 'justify-between gap-1' : 'justify-end gap-4'}`}
      >
        {isExtraSmall ? (
          (supportsBrightness || showSettingsButton) && (
            <div className="flex min-h-5 items-center gap-1.5">
              {supportsBrightness && (
                <div className="min-w-0 flex-1">
                  <BrightnessSlider
                    value={brightness}
                    onChange={onBrightnessChange}
                    onCommit={onBrightnessCommit}
                    isOn={isOn}
                    size="extra-small"
                    showLabel={false}
                    activeColor={activeColor}
                  />
                </div>
              )}

              {showSettingsButton && (
                <CardSettingsActionButton
                  {...settingsButtonProps}
                  theme={theme}
                  size="extra-small"
                  tone={isOn ? 'default' : 'muted'}
                  variant="soft"
                />
              )}
            </div>
          )
        ) : isKelvinMode && supportsColorTemperature ? (
          <KelvinSlider
            value={colorTemp}
            currentTempColor={currentTempColor}
            onChange={onTempChange}
            onCommit={onTempCommit}
            isOn={isOn}
            min={minColorTemp}
            max={maxColorTemp}
            size="small"
            showLabel
            activeColor={activeColor}
          />
        ) : supportsBrightness ? (
          <BrightnessSlider
            value={brightness}
            onChange={onBrightnessChange}
            onCommit={onBrightnessCommit}
            isOn={isOn}
            size="small"
            showLabel
            activeColor={activeColor}
          />
        ) : null}

        {!isExtraSmall && (
          <LightCardActionRow
            size="small"
            isOn={isOn}
            currentColor={currentColor}
            colorSwatchColor={colorSwatchColor}
            currentTempColor={currentTempColor}
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
            presetMaxVisible={presetMaxVisible}
            presetOverflow={presetOverflow}
          />
        )}
      </div>
    </>
  );
});
