import type { CSSProperties } from 'react';
import { memo } from 'react';
import { Button } from '@/app/components/primitives/button';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { useI18n } from '@/app/hooks';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';
import { DialogSectionRow } from './dialog-section-row';

interface CustomCardTintPickerProps {
  value?: string;
  onChange: (color: string) => void;
  isOn?: boolean;
  defaultColor?: string;
  className?: string;
  pickerRingColor?: string;
  resetButtonStyle?: CSSProperties;
}

export const CustomCardTintPicker = memo(function CustomCardTintPicker({
  value,
  onChange,
  isOn = true,
  defaultColor = '#f97316',
  className = '',
  pickerRingColor,
  resetButtonStyle,
}: CustomCardTintPickerProps) {
  const { t } = useI18n();
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);

  return (
    <DialogSectionRow
      label={t('widgets.customCard.color')}
      labelClassName={editorSurface.sectionLabelClassName}
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ColorInputSwatch
          mode="picker"
          value={value ?? defaultColor}
          ariaLabel={t('widgets.customCard.colorPicker')}
          selected={Boolean(value)}
          size="small"
          visual="rainbow"
          ringColor={pickerRingColor}
          onChange={onChange}
        />
        {value ? (
          <Button variant="soft" size="small" onClick={() => onChange('')} style={resetButtonStyle}>
            {t('common.reset')}
          </Button>
        ) : null}
      </div>
    </DialogSectionRow>
  );
});
