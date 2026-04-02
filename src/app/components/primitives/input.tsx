import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from 'react';
import {
  getControlFocusStyles,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

// Status: ready. Canonical single-line input primitive for shared search, auth, and settings forms.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    leading,
    trailing,
    invalid = false,
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
  const { theme, accentColor } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const baseBorderColor = invalid ? (theme === 'light' ? '#dc2626' : '#f87171') : undefined;

  return (
    <div className={cn('relative', containerClassName)}>
      {leading ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
          navetSizeTokens.fieldInset,
          navetTypographyTokens.control,
          leading ? 'pl-10' : 'pl-4',
          trailing ? 'pr-10' : 'pr-4',
          theme === 'light'
            ? 'border-gray-200 bg-gray-100 text-gray-900 placeholder-gray-400'
            : theme === 'black'
              ? 'border-white/16 bg-black text-white placeholder-gray-400'
              : theme === 'glass'
                ? 'border-white/16 bg-white/8 text-white placeholder-white/40'
                : 'border-zinc-800 bg-zinc-900 text-white placeholder-gray-500',
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
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>
      ) : null}
    </div>
  );
});
