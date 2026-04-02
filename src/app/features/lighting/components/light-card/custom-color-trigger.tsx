import { memo } from 'react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';

interface CustomColorTriggerProps {
  isOn: boolean;
  currentColor: string;
  onColorChange: (color: string) => void;
  size: CardSize;
}

export const CustomColorTrigger = memo(function CustomColorTrigger({
  isOn,
  currentColor,
  onColorChange,
  size,
}: CustomColorTriggerProps) {
  const { t } = useI18n();
  const controlSizes = getCardActionControlSizes(size === 'large' ? 'large' : 'small');
  const inputColor =
    typeof currentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(currentColor)
      ? currentColor
      : '#ffa500';
  const swatchSize = size === 'large' ? 'large' : 'small';

  return (
    <ColorInputSwatch
      value={inputColor}
      ariaLabel={t('lighting.chooseCustomColor')}
      title={t('lighting.customColor')}
      size={swatchSize}
      disabled={!isOn}
      className={`${controlSizes.button} shrink-0`}
      onClick={(e) => e.stopPropagation()}
      onChange={onColorChange}
    />
  );
});
