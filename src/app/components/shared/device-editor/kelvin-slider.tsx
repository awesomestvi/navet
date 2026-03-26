import * as Slider from '@radix-ui/react-slider';
import { memo } from 'react';
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
  const trackHeightClass = isExtraSmall ? 'h-[3px]' : 'h-1';
  const thumbSizeClass = isExtraSmall
    ? 'w-3.5 h-3.5'
    : isCompact || size === 'medium'
      ? 'w-4 h-4'
      : 'w-5 h-5';
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
      <Slider.Root
        data-card-interactive
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        onValueCommit={(val) => onCommit?.(val[0])}
        min={min}
        max={max}
        step={100}
        disabled={!isOn}
        className={`relative flex items-center w-full select-none touch-none ${heightClass}`}
      >
        <Slider.Track
          className={`relative grow rounded-full ${trackHeightClass}`}
          style={{ background: trackBg }}
        >
          <Slider.Range
            className="absolute h-full rounded-full"
            style={{ background: 'transparent' }}
          />
        </Slider.Track>
        <Slider.Thumb
          className={`block ${thumbSizeClass} rounded-full shadow-lg focus:outline-none cursor-pointer touch-none`}
          style={{ backgroundColor: thumbBg, boxShadow: `0 0 0 2px ${thumbRing}` }}
        />
      </Slider.Root>
    </div>
  );
});
