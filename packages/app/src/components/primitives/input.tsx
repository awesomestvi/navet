import { getTextFieldSurfaceTokens } from '@navet/app/components/shared/theme/text-field-surface-tokens';
import { getThemeAppearancePickerTokens } from '@navet/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import {
  getControlFocusStyles,
  getInputSizeTokens,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from 'react';

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
  const fieldTokens = getTextFieldSurfaceTokens(theme, invalid);

  const pickerTokens =
    variant === 'soft'
      ? getThemeAppearancePickerTokens(theme, getThemeColorValue(primaryColor))
      : null;
  const softVariantClassName =
    pickerTokens !== null
      ? `${pickerTokens.optionBorderClassName} ${pickerTokens.optionCardClassName} ${pickerTokens.textClassName} placeholder-current/40`
      : fieldTokens.fieldClassName;
  const sizeTokens = getInputSizeTokens(size);

  return (
    <div className={cn('relative', containerClassName)}>
      {leading ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
            fieldTokens.adornmentClassName
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
          sizeTokens.insetClassName,
          navetTypographyTokens.control,
          leading ? sizeTokens.leadingPaddingClassName : sizeTokens.idlePaddingLeftClassName,
          trailing ? sizeTokens.trailingPaddingClassName : sizeTokens.idlePaddingRightClassName,
          variant === 'soft' ? softVariantClassName : fieldTokens.fieldClassName,
          inputClassName
        )}
        style={{
          ...getControlFocusStyles({
            isFocused,
            accentColor,
            invalidBorderColor: fieldTokens.invalidBorderColor,
          }),
          ...style,
        }}
      />

      {trailing ? (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center pr-3',
            fieldTokens.adornmentClassName
          )}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
});
