import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Palette } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

const RAINBOW_COLOR_BACKGROUND =
  'conic-gradient(from 35deg, #f87171 0deg, #fb923c 52deg, #facc15 104deg, #4ade80 156deg, #38bdf8 208deg, #818cf8 260deg, #e879f9 312deg, #f87171 360deg)';

interface CustomColorTriggerProps {
  size: 'small' | 'medium';
  isOn: boolean;
  currentColor: string;
  isActive: boolean;
  onActivate: () => void;
  onColorChange: (color: string) => void;
}

export const CustomColorTrigger = memo(function CustomColorTrigger({
  size,
  isOn,
  currentColor,
  isActive,
  onActivate,
  onColorChange,
}: CustomColorTriggerProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const controlSizes = getCardActionControlSizes(size);
  const triggerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isLocallySelected, setIsLocallySelected] = useState(false);
  const inputColor =
    typeof currentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(currentColor)
      ? currentColor
      : '#ffa500';
  const effectiveTheme = theme === 'light' && isOn ? 'dark' : theme;
  const isSelected = isActive || isLocallySelected;

  useEffect(() => {
    if (isActive || !isOn) {
      setIsLocallySelected(false);
    }
  }, [isActive, isOn]);

  useEffect(() => {
    if (!isLocallySelected) {
      return;
    }

    const clearPendingSelection = () => setIsLocallySelected(false);
    const handlePointerDown = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) {
        clearPendingSelection();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearPendingSelection();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focus', clearPendingSelection);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', clearPendingSelection);
    };
  }, [isLocallySelected]);

  return (
    <div ref={triggerRef} className="relative shrink-0">
      <RoundControlButton
        theme={effectiveTheme}
        size={size}
        variant="soft"
        aria-label={t('lighting.chooseCustomColor')}
        title={t('lighting.customColor')}
        aria-pressed={isSelected}
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
          isActive && isOn
            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]'
            : !isOn
              ? 'text-current/60'
              : undefined
        }
        iconStyle={isLocallySelected && isOn ? { color: inputColor } : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setIsLocallySelected(true);
          colorInputRef.current?.click();
        }}
      >
        <Palette aria-hidden="true" className={controlSizes.icon} strokeWidth={2.25} />
      </RoundControlButton>
      <input
        ref={colorInputRef}
        type="color"
        value={inputColor}
        disabled={!isOn}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          setIsLocallySelected(false);
          onActivate();
          onColorChange(event.target.value);
        }}
      />
    </div>
  );
});
