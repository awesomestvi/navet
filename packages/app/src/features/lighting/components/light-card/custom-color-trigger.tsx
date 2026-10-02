import { ColorPickerPanel } from '@navet/app/components/primitives/color-picker-panel';
import { PickerPopover } from '@navet/app/components/primitives/picker-popover';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { PRESET_COLORS } from '@navet/app/constants/light-constants';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Palette } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

const RAINBOW_COLOR_BACKGROUND =
  'conic-gradient(from 35deg, #f87171 0deg, #fb923c 52deg, #facc15 104deg, #4ade80 156deg, #38bdf8 208deg, #818cf8 260deg, #e879f9 312deg, #f87171 360deg)';

interface CustomColorTriggerProps {
  size: 'small' | 'medium';
  isOn: boolean;
  foregroundColor?: string;
  currentColor: string;
  isActive: boolean;
  onActivate: () => void;
  onColorChange: (color: string) => void;
}

export const CustomColorTrigger = memo(function CustomColorTrigger({
  size,
  isOn,
  foregroundColor,
  currentColor,
  isActive,
  onActivate,
  onColorChange,
}: CustomColorTriggerProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const controlSizes = getCardActionControlSizes(size);
  const inputColor =
    typeof currentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(currentColor)
      ? currentColor
      : '#ffa500';
  const [preview, setPreview] = useState(inputColor);
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (!pending.current) setPreview(inputColor);
  }, [inputColor]);
  const commit = () => {
    if (!pending.current || !isOn) return;
    const next = pending.current;
    pending.current = null;
    onActivate();
    onColorChange(next);
  };
  const effectiveTheme = theme === 'light' && isOn ? 'dark' : theme;
  return (
    <PickerPopover
      label={t('lighting.chooseCustomColor')}
      disabled={!isOn}
      onClose={commit}
      wide
      trigger={
        <RoundControlButton
          theme={effectiveTheme}
          size={size}
          variant="soft"
          aria-label={t('lighting.chooseCustomColor')}
          title={t('lighting.customColor')}
          aria-pressed={isActive}
          disabled={!isOn}
          className={
            isActive && isOn
              ? 'overflow-hidden !border-0 !shadow-none !drop-shadow-none backdrop-blur-none'
              : !isOn
                ? 'opacity-50'
                : undefined
          }
          style={
            isActive && isOn
              ? {
                  background: RAINBOW_COLOR_BACKGROUND,
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  boxShadow: 'none',
                }
              : undefined
          }
          iconClassName={
            isActive && isOn ? 'text-slate-900' : !isOn ? 'text-current/60' : undefined
          }
          iconStyle={
            isActive && isOn ? undefined : foregroundColor ? { color: foregroundColor } : undefined
          }
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Palette aria-hidden="true" className={controlSizes.icon} strokeWidth={2.25} />
        </RoundControlButton>
      }
    >
      <ColorPickerPanel
        compact
        presets={PRESET_COLORS}
        value={preview}
        onChange={(color) => {
          pending.current = color;
          setPreview(color);
        }}
        onCommit={commit}
      />
    </PickerPopover>
  );
});
