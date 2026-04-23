import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import {
  getThemeFocusRingClassName,
  navetIconSizeTokens,
  navetRadiusTokens,
  navetSizeTokens,
  navetSpacingTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'subtle' | 'soft';
  size?: 'default' | 'small' | 'compact';
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  iconOnly?: boolean;
  label?: string;
}

// Status: in-progress. Canonical action button for form and dialog actions.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'default',
    loading = false,
    leading,
    trailing,
    iconOnly = false,
    label,
    className,
    children,
    disabled,
    style,
    ...props
  },
  ref
) {
  const { theme, accentColor, primaryColor } = useTheme();
  const isDisabled = disabled || loading;
  const iconContent = leading ?? children;

  const pickerTokens =
    variant === 'soft'
      ? getThemeAppearancePickerTokens(theme, getThemeColorValue(primaryColor))
      : null;
  const softVariantClassName =
    pickerTokens !== null
      ? `${pickerTokens.optionCardClassName} ${pickerTokens.optionBorderClassName} ${pickerTokens.textClassName}`
      : theme === 'light'
        ? 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200'
        : theme === 'black'
          ? 'border-white/16 bg-black text-white hover:bg-zinc-900'
          : theme === 'glass'
            ? 'border-white/16 bg-white/8 text-white hover:bg-white/12'
            : 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800';

  const variantClassName =
    variant === 'primary'
      ? 'border-transparent text-white'
      : variant === 'secondary' || variant === 'subtle'
        ? theme === 'light'
          ? 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200'
          : theme === 'black'
            ? 'border-white/16 bg-black text-white hover:bg-zinc-900'
            : theme === 'glass'
              ? 'border-white/16 bg-white/8 text-white hover:bg-white/12'
              : 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800'
        : variant === 'soft'
          ? softVariantClassName
          : theme === 'light'
            ? 'border-transparent bg-transparent text-gray-900 hover:bg-gray-100'
            : theme === 'black'
              ? 'border-transparent bg-transparent text-white hover:bg-zinc-900'
              : theme === 'glass'
                ? 'border-transparent bg-transparent text-white hover:bg-white/10'
                : 'border-transparent bg-transparent text-white hover:bg-zinc-800';

  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-label={iconOnly ? label : props['aria-label']}
      title={iconOnly ? label : props.title}
      className={cn(
        'inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow,opacity] disabled:cursor-not-allowed disabled:opacity-50',
        iconOnly
          ? size === 'compact'
            ? 'h-8 w-8'
            : size === 'small'
              ? 'h-8 w-8'
              : navetSizeTokens.iconButton.md
          : size === 'compact'
            ? 'min-h-8 px-3.5 py-2'
            : size === 'small'
              ? 'min-h-9'
              : navetSizeTokens.controlHeight.md,
        iconOnly
          ? ''
          : size === 'compact'
            ? ''
            : size === 'small'
              ? 'px-3.5 py-2'
              : navetSizeTokens.buttonInset,
        iconOnly ? '' : navetSpacingTokens.inline.sm,
        iconOnly ? navetRadiusTokens.pill : navetRadiusTokens.action,
        size === 'compact'
          ? 'text-xs font-medium'
          : size === 'small'
            ? navetTypographyTokens.control
            : navetTypographyTokens.control,
        variantClassName,
        getThemeFocusRingClassName(theme),
        className
      )}
      style={{
        ...(variant === 'primary' ? { backgroundColor: accentColor } : {}),
        ...(iconOnly && loading ? { borderColor: accentColor } : {}),
        ...style,
      }}
    >
      {loading ? (
        <Loader2 className={`${navetIconSizeTokens.sm} animate-spin`} aria-hidden="true" />
      ) : iconOnly ? (
        iconContent
      ) : (
        leading
      )}
      {iconOnly ? null : <span>{children}</span>}
      {!loading && !iconOnly ? trailing : null}
    </button>
  );
});
