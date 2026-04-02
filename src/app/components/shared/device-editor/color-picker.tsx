import { memo } from 'react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import type { CardSize } from '../card-size-selector';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string | null;
  isOn: boolean;
  onColorChange: (color: string) => void;
  size?: CardSize;
}

export const ColorPicker = memo(function ColorPicker({
  colors,
  selectedColor,
  isOn,
  onColorChange,
  size = 'medium',
}: ColorPickerProps) {
  const isCompact = isCompactCardSize(size);
  const swatchSize = isCompact ? 'small' : size === 'medium' ? 'medium' : 'large';

  return (
    <>
      {colors.map((color) => (
        <ColorInputSwatch
          key={color}
          mode="swatch"
          value={color}
          ariaLabel={`Select color ${color}`}
          selected={selectedColor === color}
          size={swatchSize}
          disabled={!isOn}
          onClick={(e) => {
            e.stopPropagation();
            onColorChange(color);
          }}
        />
      ))}
    </>
  );
});
