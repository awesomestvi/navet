import { Slider } from '@navet/app/components/primitives/slider';
import {
  isCompactCardSize,
  isExtraSmallCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import { memo } from 'react';
import type { CardSize } from '../card-size-selector';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface BrightnessSliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  isOn?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  size?: CardSize;
  activeColor?: string | null;
  presentation?: 'card' | 'dialog';
  min?: number;
  max?: number;
  step?: number;
  labelKey?: TranslationKey;
}

export const BrightnessSlider = memo(function BrightnessSlider({
  value,
  onChange,
  onCommit,
  isOn = true,
  disabled = false,
  showLabel = true,
  size = 'medium',
  activeColor: activeColorOverride,
  presentation = 'card',
  min = 1,
  max = 100,
  step = 1,
  labelKey = 'lighting.brightness',
}: BrightnessSliderProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const isExtraSmall = isExtraSmallCardSize(size);
  const isCompact = isCompactCardSize(size);
  const isDialogPresentation = presentation === 'dialog';
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);
  const activeColor = activeColorOverride ?? accentColor;
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'primary' : 'neutral',
    accentColor,
    baseColor: isOn ? activeColor : undefined,
  });

  const heightClass = isExtraSmall ? 'h-4' : isCompact ? 'h-5' : 'h-6';
  const useDialogControlSize = isDialogPresentation && !isExtraSmall && !isCompact;
  const trackHeightClass = useDialogControlSize ? 'h-2' : 'h-[3px]';
  const thumbSizeClass = useDialogControlSize ? 'h-5 w-5' : 'h-4 w-4';
  const trackBg = theme === 'light' ? 'bg-gray-200' : 'bg-white/10';
  const rangeBg = isOn
    ? theme === 'glass'
      ? `linear-gradient(to right, rgba(255,255,255,0.42), ${activeColor}cc)`
      : theme === 'light'
        ? `linear-gradient(to right, ${activeColor}99, ${activeColor})`
        : `linear-gradient(to right, ${activeColor}cc, ${activeColor})`
    : theme === 'light'
      ? 'linear-gradient(to right, #d1d5db, #9ca3af)'
      : 'linear-gradient(to right, rgba(255,255,255,0.24), rgba(255,255,255,0.14))';
  const thumbBg = isOn
    ? useDialogControlSize
      ? theme === 'glass'
        ? 'rgba(255,255,255,0.92)'
        : '#ffffff'
      : theme === 'glass'
        ? `${activeColor}f2`
        : activeColor
    : theme === 'light'
      ? '#d1d5db'
      : '#3a3a42';
  const thumbRing = isOn
    ? `${activeColor}66`
    : theme === 'light'
      ? 'rgba(107,114,128,0.22)'
      : 'rgba(255,255,255,0.1)';
  const thumbShadowClass = isOn ? 'shadow-lg' : theme === 'light' ? 'shadow-sm' : 'shadow-none';
  const label = t(labelKey);

  return (
    <div>
      {showLabel && (
        <div
          className={
            isDialogPresentation
              ? 'mb-4 flex items-center justify-between'
              : 'mb-1.5 flex items-center justify-between'
          }
        >
          <span
            className={
              isDialogPresentation
                ? `text-sm font-medium ${editorSurface.sectionLabelClassName}`
                : `text-xs ${editorSurface.sectionLabelClassName}`
            }
            style={isDialogPresentation ? undefined : { color: textTokens.subtitleColor }}
          >
            {label}
          </span>
          <span
            className={
              isDialogPresentation
                ? `text-sm font-semibold ${editorSurface.sectionValueClassName}`
                : `text-sm font-bold ${editorSurface.sectionValueClassName}`
            }
            style={isDialogPresentation ? undefined : { color: textTokens.titleColor }}
          >
            {value}%
          </span>
        </div>
      )}
      <Slider
        value={value}
        onValueChange={onChange}
        onValueCommit={onCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        dataCardInteractive
        ariaLabel={label}
        rootClassName={`relative flex items-center w-full select-none touch-none ${heightClass}`}
        trackClassName={`relative grow rounded-full ${trackHeightClass} ${trackBg}`}
        rangeClassName="absolute h-full rounded-full"
        thumbClassName={`block ${thumbSizeClass} rounded-full ${
          useDialogControlSize ? 'border-2' : ''
        } ${thumbShadowClass} focus:outline-none cursor-pointer touch-none`}
        touchThumbClassName={`block h-6 w-6 rounded-full ${thumbShadowClass} focus:outline-none cursor-pointer touch-none`}
        rangeStyle={{
          backgroundImage: rangeBg,
        }}
        thumbStyle={{
          backgroundColor: thumbBg,
          ...(useDialogControlSize ? { borderColor: isOn ? '#ffffff' : thumbBg } : {}),
          boxShadow: `0 0 0 2px ${thumbRing}`,
        }}
      />
    </div>
  );
});
