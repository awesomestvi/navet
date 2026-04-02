import { forwardRef, type TextareaHTMLAttributes, useState } from 'react';
import {
  getControlFocusStyles,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

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

  const baseBorderColor = invalid ? (theme === 'light' ? '#dc2626' : '#f87171') : undefined;

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
          theme === 'light'
            ? 'border-gray-200 bg-gray-100 text-gray-900 placeholder-gray-400'
            : theme === 'black'
              ? 'border-white/16 bg-black text-white placeholder-gray-400'
              : theme === 'glass'
                ? 'border-white/16 bg-white/8 text-white placeholder-white/40'
                : 'border-zinc-800 bg-zinc-900 text-white placeholder-gray-500',
          textareaClassName
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
    </div>
  );
});
