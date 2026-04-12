import { memo } from 'react';
import { Slider } from '@/app/components/primitives/slider';
import {
  isCompactCardSize,
  isExtraSmallCardSize,
} from '@/app/components/shared/card-size-selector';
import { kelvinToColor } from '@/app/features/lighting';
import { useI18n, useTheme } from '@/app/hooks';
import type { CardSize } from '../card-size-selector';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface KelvinSliderProps {
  value: number;
  currentTempColor: string;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  isOn?: boolean;
  min: number;
  max: number;
  showLabel?: boolean;
  size?: CardSize;
}

export const KelvinSlider = memo(function KelvinSlider({
  value,
  currentTempColor,
  onChange,
  onCommit,
  isOn = true,
  min,
  max,
  showLabel = true,
  size = 'medium',
}: KelvinSliderProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isExtraSmall = isExtraSmallCardSize(size);
  const isCompact = isCompactCardSize(size);
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);
  const heightClass = isExtraSmall ? 'h-4' : isCompact ? 'h-5' : 'h-6';
  const trackHeightClass = 'h-[3px]';
  const thumbSizeClass = 'w-4 h-4';
  const roundedValue = Math.round(value / 100) * 100;

  const trackBg = isOn
    ? `linear-gradient(to right, ${kelvinToColor(min)}, ${kelvinToColor(max)})`
    : theme === 'light'
      ? '#e5e7eb'
      : 'rgba(255,255,255,0.1)';

  const thumbBg = isOn
    ? theme === 'glass'
      ? 'rgba(255,255,255,0.92)'
      : '#ffffff'
    : theme === 'light'
      ? '#f3f4f6'
      : '#d1d5db';

  const thumbRing = isOn
    ? currentTempColor
    : theme === 'light'
      ? '#9ca3af'
      : 'rgba(255,255,255,0.24)';

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs ${editorSurface.sectionLabelClassName}`}>
            {t('lighting.colorTemperature')}
          </span>
          <span className={`text-sm font-bold ${editorSurface.sectionValueClassName}`}>
            {roundedValue}K
          </span>
        </div>
      )}
      <Slider
        value={value}
        onValueChange={onChange}
        onValueCommit={onCommit}
        min={min}
        max={max}
        step={100}
        disabled={!isOn}
        dataCardInteractive
        ariaLabel={t('lighting.colorTemperature')}
        rootClassName={`relative flex items-center w-full select-none touch-none ${heightClass}`}
        trackClassName={`relative grow rounded-full ${trackHeightClass}`}
        rangeClassName="absolute h-full rounded-full"
        thumbClassName={`block ${thumbSizeClass} rounded-full shadow-lg focus:outline-none cursor-pointer touch-none`}
        touchThumbClassName="block h-6 w-6 rounded-full shadow-lg focus:outline-none cursor-pointer touch-none"
        trackStyle={{ background: trackBg }}
        rangeStyle={{ background: 'transparent' }}
        thumbStyle={{ backgroundColor: thumbBg, boxShadow: `0 0 0 2px ${thumbRing}` }}
      />
    </div>
  );
});
