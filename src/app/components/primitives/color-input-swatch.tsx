import { Check } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/hooks';

type ColorInputSwatchSize = 'small' | 'medium' | 'large';
type ColorInputSwatchMode = 'picker' | 'swatch';

export interface ColorInputSwatchProps {
  value: string;
  ariaLabel: string;
  title?: string;
  disabled?: boolean;
  selected?: boolean;
  size?: ColorInputSwatchSize;
  mode?: ColorInputSwatchMode;
  ringColor?: string;
  className?: string;
  changeDebounceMs?: number;
  onChange?: (value: string) => void;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLLabelElement>;
}

const SIZE_CLASSES: Record<
  ColorInputSwatchSize,
  {
    shell: string;
    core: string;
    dot: string;
    icon: string;
  }
> = {
  small: {
    shell: 'h-8 w-8',
    core: 'h-4 w-4',
    dot: 'h-2 w-2',
    icon: 'h-3.5 w-3.5',
  },
  medium: {
    shell: 'h-10 w-10 md:h-12 md:w-12',
    core: 'h-5 w-5 md:h-6 md:w-6',
    dot: 'h-2.5 w-2.5 md:h-3 md:w-3',
    icon: 'h-4 w-4',
  },
  large: {
    shell: 'h-12 w-12',
    core: 'h-6 w-6',
    dot: 'h-3 w-3',
    icon: 'h-4 w-4',
  },
};

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export const ColorInputSwatch = memo(function ColorInputSwatch({
  value,
  ariaLabel,
  title,
  disabled = false,
  selected = false,
  size = 'medium',
  mode = 'picker',
  ringColor,
  className = '',
  changeDebounceMs = 0,
  onChange,
  onClick,
}: ColorInputSwatchProps) {
  const { theme } = useTheme();
  const classes = SIZE_CLASSES[size];
  const [previewValue, setPreviewValue] = useState(value);
  const changeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestChangeRef = useRef<string | null>(null);
  const safeValue = isValidHexColor(previewValue) ? previewValue : '#f97316';

  const clearPendingChange = useCallback(() => {
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
      changeTimeoutRef.current = null;
    }
  }, []);

  const flushPendingChange = useCallback(() => {
    const nextValue = latestChangeRef.current;
    if (!nextValue) {
      return;
    }

    clearPendingChange();
    latestChangeRef.current = null;
    onChange?.(nextValue);
  }, [clearPendingChange, onChange]);

  const handleInputChange = useCallback(
    (nextValue: string) => {
      setPreviewValue(nextValue);

      if (!changeDebounceMs) {
        onChange?.(nextValue);
        return;
      }

      latestChangeRef.current = nextValue;
      clearPendingChange();
      changeTimeoutRef.current = setTimeout(flushPendingChange, changeDebounceMs);
    },
    [changeDebounceMs, clearPendingChange, flushPendingChange, onChange]
  );

  useEffect(() => {
    setPreviewValue(value);
  }, [value]);

  useEffect(() => () => clearPendingChange(), [clearPendingChange]);

  const hasFullColorSurface = !disabled && (mode === 'picker' || selected);
  const background =
    mode === 'swatch'
      ? disabled
        ? theme === 'light'
          ? '#d1d5db'
          : 'rgba(255,255,255,0.18)'
        : safeValue
      : disabled
        ? theme === 'light'
          ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.14) 100%)'
        : `linear-gradient(135deg, ${safeValue} 0%, ${safeValue}cc 48%, rgba(255, 255, 255, 0.92) 100%)`;
  const borderColor = hasFullColorSurface
    ? 'transparent'
    : theme === 'light'
      ? 'rgba(148, 163, 184, 0.36)'
      : 'rgba(255, 255, 255, 0.18)';
  const selectionShadow = selected ? `0 10px 24px -18px ${ringColor ?? safeValue}cc` : undefined;
  const coreBackground = disabled
    ? theme === 'light'
      ? 'rgba(243,244,246,0.9)'
      : 'rgba(255,255,255,0.08)'
    : 'rgba(255,255,255,0.22)';
  const dotBorder = disabled
    ? theme === 'light'
      ? '#9ca3af'
      : 'rgba(255,255,255,0.18)'
    : 'rgba(255,255,255,0.8)';
  const sharedClassName = `${classes.shell} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
    hasFullColorSurface ? 'border-0' : 'border'
  } transition-transform duration-200 ${
    disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
  } ${className}`;
  const sharedStyle = {
    background,
    borderColor,
    boxShadow: selectionShadow,
  };

  if (mode === 'swatch') {
    return (
      <button
        type="button"
        title={title ?? ariaLabel}
        aria-label={ariaLabel}
        aria-pressed={selected}
        disabled={disabled}
        className={sharedClassName}
        onClick={onClick}
        style={sharedStyle}
      >
        {selected ? (
          <Check
            className={`${classes.icon} pointer-events-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]`}
          />
        ) : null}
      </button>
    );
  }

  return (
    <label
      title={title ?? ariaLabel}
      aria-label={ariaLabel}
      className={`cursor-pointer ${sharedClassName}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          (
            event.currentTarget.querySelector('input[type="color"]') as HTMLInputElement | null
          )?.click();
        }
      }}
      tabIndex={disabled ? -1 : 0}
      style={sharedStyle}
    >
      <input
        type="color"
        value={safeValue}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={flushPendingChange}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {selected ? (
        <Check
          className={`${classes.icon} pointer-events-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]`}
        />
      ) : (
        <div
          className={`${classes.core} pointer-events-none flex items-center justify-center rounded-full`}
          style={{
            backgroundColor: coreBackground,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className={`${classes.dot} rounded-full border`}
            style={{
              background: `linear-gradient(135deg, ${safeValue} 0%, rgba(255, 255, 255, 0.9) 100%)`,
              borderColor: dotBorder,
            }}
          />
        </div>
      )}
    </label>
  );
});
