import { ChevronDown } from 'lucide-react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes, useState } from 'react';
import {
  getControlFocusStyles,
  navetIconSizeTokens,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  containerClassName?: string;
  selectClassName?: string;
  indicatorClassName?: string;
  children: ReactNode;
}

// Status: in-progress. Minimal shared select wrapper for standard single-choice forms.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    invalid = false,
    containerClassName,
    selectClassName,
    indicatorClassName,
    onBlur,
    onFocus,
    disabled,
    style,
    children,
    ...props
  },
  ref
) {
  const { theme, accentColor } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const baseBorderColor = invalid ? (theme === 'light' ? '#dc2626' : '#f87171') : undefined;

  return (
    <div className={cn('relative', containerClassName)}>
      <select
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
          'w-full appearance-none border pl-4 pr-10 outline-none transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50',
          navetRadiusTokens.field,
          navetSizeTokens.fieldInset,
          navetTypographyTokens.control,
          theme === 'light'
            ? 'border-gray-200 bg-gray-100 text-gray-900'
            : theme === 'black'
              ? 'border-white/16 bg-black text-white'
              : theme === 'glass'
                ? 'border-white/16 bg-white/8 text-white'
                : 'border-zinc-800 bg-zinc-900 text-white',
          selectClassName
        )}
        style={{
          ...getControlFocusStyles({
            isFocused,
            accentColor,
            invalidBorderColor: baseBorderColor,
            includeCaret: false,
          }),
          ...style,
        }}
      >
        {children}
      </select>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
          indicatorClassName
        )}
      >
        <ChevronDown className={`${navetIconSizeTokens.sm} text-current/60`} />
      </div>
    </div>
  );
});
