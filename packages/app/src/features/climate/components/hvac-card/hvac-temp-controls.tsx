import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { navetSpacingTokens } from '@navet/app/components/system/tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Minus, Plus } from 'lucide-react';
import { memo } from 'react';

interface HVACTempControlsProps {
  targetTemp: number;
  onTempChange: (temp: number) => void;
  onTempCommit?: (temp: number) => void;
  isOn: boolean;
  size?: CardSize;
  minTemp?: number;
  maxTemp?: number;
  step?: number;
}

function snapTemperature(value: number, minTemp: number, maxTemp: number, step: number) {
  const safeStep = step > 0 ? step : 0.5;
  const snappedValue = Math.round((value - minTemp) / safeStep) * safeStep + minTemp;
  return Number(Math.min(maxTemp, Math.max(minTemp, snappedValue)).toFixed(3));
}

export const HVACTempControls = memo(function HVACTempControls({
  targetTemp,
  onTempChange,
  onTempCommit,
  isOn,
  size = 'medium',
  minTemp = 16,
  maxTemp = 30,
  step = 0.5,
}: HVACTempControlsProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isCompact = isCompactCardSize(size);
  const primitiveSize = isCompact ? 'small' : size === 'large' ? 'large' : 'medium';
  const controlSizes = getCardActionControlSizes(primitiveSize);
  const hoverScale = isCompact ? 'hover:scale-105' : '';

  return (
    <div className={`flex items-center ${navetSpacingTokens.inline.xs}`}>
      <RoundControlButton
        theme={theme}
        size={primitiveSize}
        variant="soft"
        onClick={(e) => {
          e.stopPropagation();
          const nextTemp = snapTemperature(targetTemp - step, minTemp, maxTemp, step);
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
          const nextTemp = snapTemperature(targetTemp + step, minTemp, maxTemp, step);
          (onTempCommit ?? onTempChange)(nextTemp);
        }}
        aria-label={t('climate.increaseTemperature')}
        disabled={!isOn}
        className={`${hoverScale} disabled:opacity-50`}
      >
        <Plus className={controlSizes.icon} />
      </RoundControlButton>
    </div>
  );
});
