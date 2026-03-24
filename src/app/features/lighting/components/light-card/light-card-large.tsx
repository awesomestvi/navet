import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { CardActionRow } from '@/app/components/shared/card-action-row';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import {
  BrightnessPresetsInline,
  BrightnessSlider,
  ColorPicker,
  KelvinSlider,
} from '@/app/components/shared/device-editor';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { PRESET_COLORS } from '@/app/constants/light-constants';
import { useI18n, useTheme } from '@/app/hooks';
import { CustomColorTrigger } from './custom-color-trigger';
import { KelvinColorTrigger } from './kelvin-color-trigger';
import { LightCardHeader } from './light-card-header';
import type { HeaderIconButtonProps, LightBrightnessPreset } from './light-card-types';
import { roundKelvin } from './light-card-utils';

interface LightCardLargeProps {
  name: string;
  brightness: number;
  brightnessPresets: LightBrightnessPreset[];
  selectedColor: string | null;
  currentColor: string;
  colorTemp: number;
  currentTempColor: string;
  minColorTemp: number;
  maxColorTemp: number;
  isOn: boolean;
  isKelvinMode: boolean;
  IconComponent: LucideIcon;
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

export const LightCardLarge = memo(function LightCardLarge({
  name,
  brightness,
  brightnessPresets,
  selectedColor,
  currentColor,
  colorTemp,
  currentTempColor,
  minColorTemp,
  maxColorTemp,
  isOn,
  isKelvinMode,
  IconComponent,
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
}: LightCardLargeProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const secondaryTextColor = stateSurface.secondaryTextClassName;
  const textColor = stateSurface.primaryTextClassName;
  const labelTokens = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'primary' : 'neutral',
    accentColor,
  });

  const roundedTemp = roundKelvin(colorTemp);

  return (
    <>
      <LightCardHeader
        name={name}
        isOn={isOn}
        IconComponent={IconComponent}
        size="large"
        iconAriaLabel={iconButtonProps['aria-label']}
        onIconClick={iconButtonProps.onClick}
        onIconPointerDown={iconButtonProps.onPointerDown}
      />

      <div className="flex-1 flex flex-col justify-between">
        {/* Slider section */}
        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-2">
            <div
              className={`text-xs ${secondaryTextColor}`}
              style={{ color: labelTokens.subtitleColor }}
            >
              {isKelvinMode && supportsColorTemperature
                ? t('lighting.colorTemperature')
                : t('lighting.brightness')}
            </div>
            <div className={`text-2xl font-bold ${textColor}`}>
              {isKelvinMode && supportsColorTemperature ? `${roundedTemp}K` : `${brightness}%`}
            </div>
          </div>

          {isKelvinMode && supportsColorTemperature ? (
            <KelvinSlider
              value={colorTemp}
              currentTempColor={currentTempColor}
              onChange={onTempChange}
              onCommit={onTempCommit}
              isOn={isOn}
              min={minColorTemp}
              max={maxColorTemp}
              showLabel={false}
              size="large"
            />
          ) : (
            <BrightnessSlider
              value={brightness}
              onChange={onBrightnessChange}
              onCommit={onBrightnessCommit}
              isOn={isOn}
              showLabel={false}
              size="large"
            />
          )}

          {!isKelvinMode && (
            <div className="mt-3">
              <BrightnessPresetsInline
                presets={brightnessPresets}
                currentBrightness={brightness}
                isOn={isOn}
                onBrightnessChange={onBrightnessCommit}
                size="large"
                buttonVariant="soft"
              />
            </div>
          )}
        </div>

        {(supportsColorTemperature || supportsColorControl) && (
          <div className="space-y-2">
            <div
              className={`text-xs ${secondaryTextColor}`}
              style={{ color: labelTokens.subtitleColor }}
            >
              {t('lighting.colors')}
            </div>
            <div className="flex items-center gap-2">
              {supportsColorTemperature && (
                <KelvinColorTrigger
                  isOn={isOn}
                  currentTempColor={currentTempColor}
                  isActive={isKelvinMode}
                  size="large"
                  onClick={onKelvinToggle}
                />
              )}
              {supportsColorControl && (
                <>
                  <ColorPicker
                    colors={Array.from(PRESET_COLORS).slice(0, 4)}
                    selectedColor={selectedColor}
                    isOn={isOn}
                    onColorChange={onColorChange}
                    size="large"
                  />
                  <CustomColorTrigger
                    isOn={isOn}
                    currentColor={currentColor}
                    onColorChange={onColorChange}
                    size="large"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {showSettingsButton && (
          <div className="mt-auto pt-4">
            <CardActionRow
              theme={theme}
              size="large"
              rightContent={
                <CardSettingsActionButton
                  {...settingsButtonProps}
                  theme={theme}
                  size="large"
                  tone={isOn ? 'default' : 'muted'}
                  variant="soft"
                />
              }
            />
          </div>
        )}
      </div>
    </>
  );
});
