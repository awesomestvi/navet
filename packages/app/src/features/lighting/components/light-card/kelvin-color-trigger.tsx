import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ThermometerSun } from 'lucide-react';
import { memo } from 'react';

interface KelvinColorTriggerProps {
  size: 'small' | 'medium';
  isOn: boolean;
  currentTempColor: string;
  isActive: boolean;
  onClick: () => void;
}

export const KelvinColorTrigger = memo(function KelvinColorTrigger({
  size,
  isOn,
  currentTempColor,
  isActive,
  onClick,
}: KelvinColorTriggerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const controlSizes = getCardActionControlSizes(size);
  const effectiveTheme = theme === 'light' && isOn ? 'dark' : theme;

  return (
    <RoundControlButton
      theme={effectiveTheme}
      size={size}
      variant="soft"
      aria-label={t('lighting.colorTemperature')}
      title={t('lighting.colorTemperature')}
      aria-pressed={isActive}
      disabled={!isOn}
      className={!isOn ? 'opacity-50' : undefined}
      iconClassName={!isOn ? 'text-current/60' : undefined}
      iconStyle={isActive && isOn ? { color: currentTempColor } : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <ThermometerSun aria-hidden="true" className={controlSizes.icon} strokeWidth={2.25} />
    </RoundControlButton>
  );
});
