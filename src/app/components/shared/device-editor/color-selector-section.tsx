import { memo } from 'react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface ColorSelectorSectionProps {
  colors: string[];
  selectedColor: string | null;
  customColor: string;
  isOn: boolean;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
}

export const ColorSelectorSection = memo(function ColorSelectorSection({
  colors,
  selectedColor,
  customColor,
  isOn,
  onColorChange,
  onCustomColorChange,
}: ColorSelectorSectionProps) {
  const { primaryColor } = useTheme();
  const { t } = useI18n();
  const activeColor = getThemeColorValue(primaryColor);
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);
  return (
    <div>
      <span
        className={`mb-4 block text-sm font-medium transition-colors duration-500 ${editorSurface.sectionLabelClassName}`}
      >
        {t('lighting.lightColor')}
      </span>

      {/* Preset Colors + Custom Color Button */}
      <div className="flex flex-wrap items-center gap-2.5">
        <ColorInputSwatch
          value={customColor}
          ariaLabel={t('lighting.customColorPicker')}
          title={t('lighting.customColorPicker')}
          size="small"
          visual="rainbow"
          disabled={!isOn}
          selected={selectedColor === customColor}
          ringColor={activeColor}
          className={!isOn ? editorSurface.disabledCircleClassName : ''}
          onChange={(value) => {
            onCustomColorChange(value);
            onColorChange(value);
          }}
        />
        {colors.map((color) => (
          <button
            type="button"
            key={color}
            onClick={() => onColorChange(color)}
            disabled={!isOn}
            className={`h-8 w-8 rounded-full transition-all duration-300 ${
              isOn ? 'hover:scale-110' : editorSurface.disabledCircleClassName
            } ${selectedColor === color ? 'scale-110 shadow-lg' : ''}`}
            style={{
              backgroundColor: color,
              boxShadow: selectedColor === color ? `0 0 0 4px ${activeColor}` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
});
