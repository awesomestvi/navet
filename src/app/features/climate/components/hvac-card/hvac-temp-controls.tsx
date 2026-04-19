import { Minus, Plus } from 'lucide-react';
import { memo } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { useI18n, useTheme } from '@/app/hooks';

interface HVACTempControlsProps {
  targetTemp: number;
  onTempChange: (temp: number) => void;
  onTempCommit?: (temp: number) => void;
  isOn: boolean;
  size?: CardSize;
}

export const HVACTempControls = memo(function HVACTempControls({
  targetTemp,
  onTempChange,
  onTempCommit,
  isOn,
  size = 'medium',
}: HVACTempControlsProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isCompact = isCompactCardSize(size);
  const primitiveSize = isCompact ? 'small' : size === 'large' ? 'large' : 'medium';
  const controlSizes = getCardActionControlSizes(primitiveSize);
  const hoverScale = isCompact ? 'hover:scale-105' : '';

  return (
    <>
      <RoundControlButton
        theme={theme}
        size={primitiveSize}
        variant="soft"
        onClick={(e) => {
          e.stopPropagation();
          const nextTemp = Math.max(16, targetTemp - 0.5);
          (onTempCommit ?? onTempChange)(nextTemp);
        }}
        aria-label={t('climate.decreaseTemperature')}
        disabled={!isOn}
        className={`${hoverScale} disabled:opacity-50`}
      >
        <Minus className={controlSizes.icon} />
      </RoundControlButton>
      <RoundControlButton
        theme={theme}
        size={primitiveSize}
        variant="soft"
        onClick={(e) => {
          e.stopPropagation();
          const nextTemp = Math.min(30, targetTemp + 0.5);
          (onTempCommit ?? onTempChange)(nextTemp);
        }}
        aria-label={t('climate.increaseTemperature')}
        disabled={!isOn}
        className={`${hoverScale} disabled:opacity-50`}
      >
        <Plus className={controlSizes.icon} />
      </RoundControlButton>
    </>
  );
});
