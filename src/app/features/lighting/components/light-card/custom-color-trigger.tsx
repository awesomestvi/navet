import { memo } from 'react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { useI18n } from '@/app/hooks';

interface CustomColorTriggerProps {
  isOn: boolean;
  currentColor: string;
  isActive: boolean;
  onActivate: () => void;
  onColorChange: (color: string) => void;
}

export const CustomColorTrigger = memo(function CustomColorTrigger({
  isOn,
  currentColor,
  isActive,
  onActivate,
  onColorChange,
}: CustomColorTriggerProps) {
  const { t } = useI18n();
  const controlSizes = getCardActionControlSizes('small');
  const inputColor =
    typeof currentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(currentColor)
      ? currentColor
      : '#ffa500';

  return (
    <ColorInputSwatch
      value={inputColor}
      ariaLabel={t('lighting.chooseCustomColor')}
      title={t('lighting.customColor')}
      size="small"
      visual={isActive ? 'rainbow' : 'idle'}
      disabled={!isOn}
      className={`${controlSizes.button} shrink-0`}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onChange={(color) => {
        onActivate();
        onColorChange(color);
      }}
    />
  );
});
