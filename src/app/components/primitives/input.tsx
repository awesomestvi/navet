import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import {
  getControlFocusStyles,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
  size?: 'default' | 'small';
  variant?: 'default' | 'soft';
  containerClassName?: string;
  inputClassName?: string;
}

// Status: ready. Canonical single-line input primitive for shared search, auth, and settings forms.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    leading,
    trailing,
    invalid = false,
    size = 'default',
    variant = 'default',
    containerClassName,
    inputClassName,
    onBlur,
    onFocus,
    disabled,
    style,
    ...props
  },
  ref
) {
  const { theme, accentColor, primaryColor } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const pickerTokens =
    variant === 'soft'
      ? getThemeAppearancePickerTokens(theme, getThemeColorValue(primaryColor))
      : null;
  const softVariantClassName =
    pickerTokens !== null
      ? `${pickerTokens.optionBorderClassName} ${pickerTokens.optionCardClassName} ${pickerTokens.textClassName} placeholder-current/40`
      : theme === 'light'
        ? 'border-gray-200 bg-gray-100 text-gray-900 placeholder-slate-500'
        : theme === 'black'
          ? 'border-white/16 bg-black text-white placeholder-zinc-300'
          : theme === 'glass'
            ? 'border-white/16 bg-white/8 text-white placeholder-white/72'
            : 'border-zinc-800 bg-zinc-900 text-white placeholder-zinc-400';

  const baseBorderColor = invalid ? (theme === 'light' ? '#dc2626' : '#f87171') : undefined;
  const adornmentClassName =
    theme === 'light'
      ? 'text-slate-500'
      : theme === 'black'
        ? 'text-zinc-300'
        : theme === 'glass'
          ? 'text-white/72'
          : 'text-zinc-400';

  return (
    <div className={cn('relative', containerClassName)}>
      {leading ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
            adornmentClassName
          )}
        >
          {leading}
        </div>
      ) : null}

      <input
        {...props}
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || props['aria-invalid'] === true ? true : undefined}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        className={cn(
          'w-full border outline-none transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50',
          navetRadiusTokens.field,
          size === 'small' ? 'px-3 py-2' : navetSizeTokens.fieldInset,
          navetTypographyTokens.control,
          leading ? (size === 'small' ? 'pl-9' : 'pl-10') : size === 'small' ? 'pl-3' : 'pl-4',
          trailing ? (size === 'small' ? 'pr-9' : 'pr-10') : size === 'small' ? 'pr-3' : 'pr-4',
          variant === 'soft'
            ? softVariantClassName
            : theme === 'light'
              ? 'border-gray-200 bg-gray-100 text-gray-900 placeholder-slate-500'
              : theme === 'black'
                ? 'border-white/16 bg-black text-white placeholder-zinc-300'
                : theme === 'glass'
                  ? 'border-white/16 bg-white/8 text-white placeholder-white/72'
                  : 'border-zinc-800 bg-zinc-900 text-white placeholder-zinc-400',
          inputClassName
        )}
        style={{
          ...getControlFocusStyles({
            isFocused,
            accentColor,
            invalidBorderColor: baseBorderColor,
          }),
          ...style,
        }}
      />

      {trailing ? (
        <div
          className={cn('absolute inset-y-0 right-0 flex items-center pr-3', adornmentClassName)}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
});
