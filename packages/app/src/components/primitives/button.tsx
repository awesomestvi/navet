import { getThemeAppearancePickerTokens } from '@navet/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import {
  getButtonSizeTokens,
  getThemeFocusRingClassName,
  navetControlTokens,
  navetIconSizeTokens,
  navetSpacingTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

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
  const sizeTokens = getButtonSizeTokens(size);

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
  const disabledVariantClassName =
    variant === 'primary'
      ? theme === 'light'
        ? 'disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500'
        : 'disabled:border-white/12 disabled:bg-white/10 disabled:text-white/50'
      : variant === 'ghost'
        ? theme === 'light'
          ? 'disabled:border-transparent disabled:bg-transparent disabled:text-slate-400'
          : 'disabled:border-transparent disabled:bg-transparent disabled:text-white/35'
        : theme === 'light'
          ? 'disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500'
          : theme === 'black'
            ? 'disabled:border-white/12 disabled:bg-white/6 disabled:text-white/45'
            : theme === 'glass'
              ? 'disabled:border-white/12 disabled:bg-white/6 disabled:text-white/45'
              : 'disabled:border-zinc-800 disabled:bg-zinc-900/80 disabled:text-zinc-500';

  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-label={iconOnly ? label : props['aria-label']}
      title={iconOnly ? label : props.title}
      className={cn(
        'inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow,opacity] disabled:cursor-not-allowed disabled:shadow-none',
        iconOnly ? sizeTokens.iconOnlyClassName : sizeTokens.heightClassName,
        iconOnly ? '' : sizeTokens.paddingXClassName,
        iconOnly ? '' : navetSpacingTokens.inline.sm,
        iconOnly
          ? navetControlTokens.iconButton.radiusClassName
          : navetControlTokens.button.radiusClassName,
        sizeTokens.textClassName,
        variantClassName,
        disabledVariantClassName,
        getThemeFocusRingClassName(theme),
        className
      )}
      style={{
        ...(variant === 'primary' && !isDisabled ? { backgroundColor: accentColor } : {}),
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
