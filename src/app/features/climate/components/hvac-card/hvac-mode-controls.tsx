import { Flame, Snowflake, Wind } from 'lucide-react';
import { memo } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n, useTheme } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { getHVACModeButtonColor } from '../../utils/hvac-styles';

interface HVACModeControlsProps {
  mode: string;
  isOn: boolean;
  onModeChange: (mode: string) => void;
  size?: CardSize;
}

export const HVACModeControls = memo(function HVACModeControls({
  mode,
  isOn,
  onModeChange,
  size = 'medium',
}: HVACModeControlsProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const primitiveSize = size === 'large' ? 'large' : 'medium';
  const controlSizes = getCardActionControlSizes(primitiveSize);

  return (
    <>
      <RoundControlButton
        theme={theme as ThemeType}
        size={primitiveSize}
        variant="soft"
        onClick={(e) => {
          e.stopPropagation();
          onModeChange('cool');
        }}
        aria-label={t('climate.mode.cool')}
        disabled={!isOn}
        className={`disabled:opacity-50 ${getHVACModeButtonColor('cool', mode, isOn, theme as ThemeType)}`}
      >
        <Snowflake className={controlSizes.icon} />
      </RoundControlButton>
      <RoundControlButton
        theme={theme as ThemeType}
        size={primitiveSize}
        variant="soft"
        onClick={(e) => {
          e.stopPropagation();
          onModeChange('heat');
        }}
        aria-label={t('climate.mode.heat')}
        disabled={!isOn}
        className={`disabled:opacity-50 ${getHVACModeButtonColor('heat', mode, isOn, theme as ThemeType)}`}
      >
        <Flame className={controlSizes.icon} />
      </RoundControlButton>
      <RoundControlButton
        theme={theme as ThemeType}
        size={primitiveSize}
        variant="soft"
        onClick={(e) => {
          e.stopPropagation();
          onModeChange('fan');
        }}
        aria-label={t('climate.mode.fan')}
        disabled={!isOn}
        className={`disabled:opacity-50 ${getHVACModeButtonColor('fan', mode, isOn, theme as ThemeType)}`}
      >
        <Wind className={controlSizes.icon} />
      </RoundControlButton>
    </>
  );
});
