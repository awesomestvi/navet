import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { useI18n, useTheme } from '@/app/hooks';
import {
  getBrightnessPresetAccentColor,
  getBrightnessPresetSelectedStyle,
} from './brightness-preset-styles';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface BrightnessPreset {
  icon: LucideIcon;
  brightness: number;
  key?: string;
  label: string;
}

interface BrightnessPresetsProps {
  presets: BrightnessPreset[];
  currentBrightness: number;
  isOn: boolean;
  onBrightnessChange: (brightness: number) => void;
}

export const BrightnessPresets = memo(function BrightnessPresets({
  presets,
  currentBrightness,
  isOn,
  onBrightnessChange,
}: BrightnessPresetsProps) {
  const { primaryColor, theme } = useTheme();
  const { t } = useI18n();
  const activeColor = getBrightnessPresetAccentColor(primaryColor);
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);

  return (
    <div>
      <span
        className={`mb-4 block text-sm font-medium transition-colors duration-500 ${editorSurface.sectionLabelClassName}`}
      >
        {t('lighting.brightnessPresets')}
      </span>

      {/* Preset Brightness Levels */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {presets.map((preset) => {
          const IconComponent = preset.icon;
          const isSelected = currentBrightness === preset.brightness;
          return (
            <button
              type="button"
              key={preset.brightness}
              onClick={() => onBrightnessChange(preset.brightness)}
              disabled={!isOn}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                isOn ? 'hover:scale-110' : editorSurface.disabledCircleClassName
              } ${isSelected ? 'scale-110 shadow-lg' : ''}`}
              style={{
                ...(isSelected
                  ? getBrightnessPresetSelectedStyle(theme, activeColor, isOn)
                  : {
                      backgroundColor: isOn
                        ? `${activeColor}22`
                        : editorSurface.disabledSurfaceColor,
                      borderColor: isOn ? `${activeColor}33` : 'transparent',
                    }),
              }}
            >
              <IconComponent
                className={`h-4 w-4 ${
                  isSelected ? 'text-white' : isOn ? 'text-white/90' : editorSurface.iconClassName
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});
