import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { type CardSize, isExtraSmallCardSize } from '@/app/components/shared/card-size-selector';
import { BrightnessSlider, KelvinSlider } from '@/app/components/shared/device-editor';
import { useTheme } from '@/app/hooks';
import { LightCardActionRow } from './light-card-action-row';
import { LightCardHeader } from './light-card-header';
import type { HeaderIconButtonProps, LightBrightnessPreset } from './light-card-types';

interface LightCardSmallProps {
  name: string;
  room: string;
  size: CardSize;
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
}

export const LightCardSmall = memo(function LightCardSmall({
  name,
  size,
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
}: LightCardSmallProps) {
  const { theme } = useTheme();
  const isExtraSmall = isExtraSmallCardSize(size);
  const hasColorFeatures = supportsColorTemperature || supportsColorControl;
  const colorButtonCount = (supportsColorTemperature ? 1 : 0) + (supportsColorControl ? 1 : 0);
  // If color features exist: cap visible presets so total left buttons ≤ 2, rest in overflow menu.
  // If no color features: show all presets inline.
  const presetMaxVisible = hasColorFeatures ? Math.max(0, 2 - colorButtonCount) : undefined;
  const presetOverflow: 'menu' | 'hide' = hasColorFeatures ? 'menu' : 'hide';

  return (
    <>
      <LightCardHeader
        name={name}
        isOn={isOn}
        IconComponent={IconComponent}
        iconText={iconText}
        size={size}
        iconAriaLabel={iconButtonProps['aria-label']}
        onIconClick={iconButtonProps.onClick}
        onIconPointerDown={iconButtonProps.onPointerDown}
      />

      <div
        className={`flex-1 flex flex-col ${isExtraSmall ? 'justify-between gap-1.5' : 'justify-end gap-4'}`}
      >
        {isExtraSmall ? (
          <div className="flex min-h-6 items-center gap-2">
            <div className="min-w-0 flex-1">
              <BrightnessSlider
                value={brightness}
                onChange={onBrightnessChange}
                onCommit={onBrightnessCommit}
                isOn={isOn}
                size="extra-small"
                showLabel={false}
              />
            </div>

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
          />
        ) : (
          <BrightnessSlider
            value={brightness}
            onChange={onBrightnessChange}
            onCommit={onBrightnessCommit}
            isOn={isOn}
            size="small"
            showLabel
          />
        )}

        {!isExtraSmall && (
          <LightCardActionRow
            size="small"
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
            presetMaxVisible={presetMaxVisible}
            presetOverflow={presetOverflow}
          />
        )}
      </div>
    </>
  );
});
