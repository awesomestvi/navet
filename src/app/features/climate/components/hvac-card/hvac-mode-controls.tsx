import { Flame, Snowflake, ThermometerSun, Wind } from 'lucide-react';
import { memo } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n, useTheme } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { resolveHvacModeControlOptions } from '../../utils/hvac-mode-control-options';
import { getHVACModeButtonColor } from '../../utils/hvac-styles';

interface HVACModeControlsProps {
  mode: string;
  isOn: boolean;
  onModeChange: (mode: string) => void;
  supportedHvacModes?: string[];
  size?: CardSize;
}

export const HVACModeControls = memo(function HVACModeControls({
  mode,
  isOn,
  onModeChange,
  supportedHvacModes,
  size = 'medium',
}: HVACModeControlsProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const primitiveSize = size === 'large' ? 'large' : 'medium';
  const controlSizes = getCardActionControlSizes(primitiveSize);
  const options = resolveHvacModeControlOptions(supportedHvacModes);

  const iconByMode = {
    auto: ThermometerSun,
    cool: Snowflake,
    heat: Flame,
    fan: Wind,
  } as const;

  const labelByMode = {
    auto: t('settings.appearance.systemTheme.auto'),
    cool: t('climate.mode.cool'),
    heat: t('climate.mode.heat'),
    fan: t('climate.mode.fan'),
  } as const;

  return (
    <>
      {options.map((option) => {
        const Icon = iconByMode[option.key];

        return (
          <RoundControlButton
            key={option.key}
            theme={theme as ThemeType}
            size={primitiveSize}
            variant="soft"
            onClick={(e) => {
              e.stopPropagation();
              onModeChange(option.mode);
            }}
            aria-label={labelByMode[option.key]}
            className={`disabled:opacity-50 ${getHVACModeButtonColor(option.key, mode, isOn, theme as ThemeType)}`}
          >
            <Icon className={controlSizes.icon} />
          </RoundControlButton>
        );
      })}
    </>
  );
});
