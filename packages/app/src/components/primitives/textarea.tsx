import { getTextFieldSurfaceTokens } from '@navet/app/components/shared/theme/text-field-surface-tokens';
import {
  getControlFocusStyles,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { forwardRef, type TextareaHTMLAttributes, useState } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  containerClassName?: string;
  textareaClassName?: string;
}

// Status: in-progress. Shared multiline field for notes and settings text areas.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    invalid = false,
    containerClassName,
    textareaClassName,
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
  const fieldTokens = getTextFieldSurfaceTokens(theme, invalid);

  return (
    <div className={cn('relative', containerClassName)}>
      <textarea
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
          navetSizeTokens.textareaMinHeight,
          navetRadiusTokens.field,
          navetSizeTokens.fieldInset,
          navetTypographyTokens.control,
          fieldTokens.fieldClassName,
          textareaClassName
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
    </div>
  );
});
