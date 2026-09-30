import { PickerPopover } from '@navet/app/components/primitives/picker-popover';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { useI18n, useTheme } from '@navet/app/hooks';
import { kelvinToColor } from '@navet/app/utils/light-color-temperature';
import { ThermometerSun } from 'lucide-react';
import { memo } from 'react';

interface KelvinColorTriggerProps {
  size: 'small' | 'medium';
  isOn: boolean;
  foregroundColor?: string;
  currentTempColor: string;
  isActive: boolean;
  onClick: () => void;
  temperature?: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    onCommit: (value: number) => void;
  };
}

export const KelvinColorTrigger = memo(function KelvinColorTrigger({
  size,
  isOn,
  foregroundColor,
  currentTempColor,
  isActive,
  onClick,
  temperature,
}: KelvinColorTriggerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const controlSizes = getCardActionControlSizes(size);
  const effectiveTheme = theme === 'light' && isOn ? 'dark' : theme;

  const trigger = (
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
      iconStyle={
        foregroundColor
          ? { color: foregroundColor }
          : isActive && isOn
            ? { color: currentTempColor }
            : undefined
      }
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (!temperature) onClick();
      }}
    >
      <ThermometerSun aria-hidden="true" className={controlSizes.icon} strokeWidth={2.25} />
    </RoundControlButton>
  );
  if (!temperature) return trigger;
  const { value, min, max, onChange, onCommit } = temperature;
  return (
    <PickerPopover label={t('lighting.colorTemperature')} disabled={!isOn} trigger={trigger}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{t('lighting.warmth')}</span>
          <span className="tabular-nums">{Math.round(value)} K</span>
        </div>
        <Slider
          value={value}
          min={min}
          max={max}
          step={100}
          ariaLabel={t('lighting.colorTemperature')}
          onValueChange={onChange}
          onValueCommit={onCommit}
          rootClassName="relative flex h-9 w-full touch-none select-none items-center"
          trackClassName="relative h-6 grow rounded-full border border-current/10"
          trackStyle={{
            background: `linear-gradient(to right, ${kelvinToColor(min)}, ${kelvinToColor(max)})`,
          }}
          rangeStyle={{ background: 'transparent' }}
          thumbClassName="block h-5 w-5 rounded-full border-2 border-white bg-white shadow-[0_0_0_1px_#0008] outline-none focus-visible:ring-2 focus-visible:ring-current"
        />
        <div className="flex justify-between text-xs opacity-70">
          <span>{min} K</span>
          <span>{max} K</span>
        </div>
      </div>
    </PickerPopover>
  );
});
