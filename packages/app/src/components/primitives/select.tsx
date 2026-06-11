import {
  getControlFocusStyles,
  navetIconSizeTokens,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { ChevronDown } from 'lucide-react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes, useState } from 'react';

type SelectSize = 'default' | 'small';
type SelectVariant = 'default' | 'ghost';

const SELECT_SIZE_CLASS_NAMES: Record<SelectSize, string> = {
  default: 'px-4 py-3',
  small: 'h-9 pl-3.5 pr-10 py-0 leading-5',
};

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  invalid?: boolean;
  containerClassName?: string;
  selectClassName?: string;
  indicatorClassName?: string;
  accentColorOverride?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  children: ReactNode;
}

// Status: in-progress. Minimal shared select wrapper for standard single-choice forms.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    invalid = false,
    containerClassName,
    selectClassName,
    indicatorClassName,
    accentColorOverride,
    size = 'default',
    variant = 'default',
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
  const resolvedAccentColor = accentColorOverride ?? accentColor;

  const baseBorderColor = invalid ? (theme === 'light' ? '#dc2626' : '#f87171') : undefined;
  const themeClassName =
    variant === 'ghost'
      ? theme === 'light'
        ? 'border-transparent bg-transparent text-gray-700'
        : 'border-transparent bg-transparent text-white/78'
      : theme === 'light'
        ? 'border-gray-200 bg-gray-100 text-gray-900'
        : theme === 'black'
          ? 'border-white/16 bg-black text-white'
          : theme === 'glass'
            ? 'border-white/16 bg-white/8 text-white'
            : 'border-zinc-800 bg-zinc-900 text-white';

  return (
    <div className={cn('relative', containerClassName)}>
      <select
        {...props}
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || props['aria-invalid'] === true ? true : undefined}
        onFocus={(event) => {
          setIsFocused(event.currentTarget.matches(':focus-visible'));
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        className={cn(
          'w-full appearance-none border outline-none transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50',
          navetRadiusTokens.field,
          SELECT_SIZE_CLASS_NAMES[size],
          navetTypographyTokens.control,
          themeClassName,
          selectClassName
        )}
        style={{
          ...getControlFocusStyles({
            isFocused,
            accentColor: resolvedAccentColor,
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
