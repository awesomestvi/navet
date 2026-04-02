import { memo } from 'react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { type CardSize, isCompactCardSize } from '../card-size-selector';

interface ColorTemperature {
  value: number;
  color: string;
  label: string;
}

interface ColorTemperaturePresetsProps {
  options: ColorTemperature[];
  currentTemp: number;
  selectedColor: string | null;
  isOn: boolean;
  onTempChange: (temp: number) => void;
  onClearColor: () => void;
  size?: CardSize;
}

export const ColorTemperaturePresets = memo(function ColorTemperaturePresets({
  options,
  currentTemp,
  selectedColor,
  isOn,
  onTempChange,
  onClearColor,
  size = 'medium',
}: ColorTemperaturePresetsProps) {
  const isCompact = isCompactCardSize(size);
  const swatchSize = isCompact ? 'small' : size === 'medium' ? 'medium' : 'large';

  return (
    <>
      {options.map((option) => (
        <ColorInputSwatch
          key={option.value}
          mode="swatch"
          value={option.color}
          ariaLabel={`${option.label} (${option.value}K)`}
          title={size === 'large' ? `${option.label} (${option.value}K)` : option.label}
          size={swatchSize}
          selected={currentTemp === option.value && !selectedColor && isOn}
          onClick={(e) => {
            e.stopPropagation();
            onTempChange(option.value);
            onClearColor();
          }}
          disabled={!isOn}
        />
      ))}
    </>
  );
});
