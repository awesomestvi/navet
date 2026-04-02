import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
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
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

// Status: in-progress. Canonical action button for form and dialog actions.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    loading = false,
    leading,
    trailing,
    className,
    children,
    disabled,
    style,
    ...props
  },
  ref
) {
  const { theme, accentColor } = useTheme();
  const isDisabled = disabled || loading;

  const variantClassName =
    variant === 'primary'
      ? 'border-transparent text-white'
      : variant === 'secondary'
        ? theme === 'light'
          ? 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200'
          : theme === 'black'
            ? 'border-white/16 bg-black text-white hover:bg-zinc-900'
            : theme === 'glass'
              ? 'border-white/16 bg-white/8 text-white hover:bg-white/12'
              : 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800'
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
      className={cn(
        'inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow,opacity] disabled:cursor-not-allowed disabled:opacity-50',
        navetSizeTokens.controlHeight.md,
        navetSizeTokens.buttonInset,
        navetSpacingTokens.inline.sm,
        navetRadiusTokens.action,
        navetTypographyTokens.control,
        variantClassName,
        getThemeFocusRingClassName(theme),
        className
      )}
      style={{
        ...(variant === 'primary' ? { backgroundColor: accentColor } : {}),
        ...style,
      }}
    >
      {loading ? (
        <Loader2 className={`${navetIconSizeTokens.sm} animate-spin`} aria-hidden="true" />
      ) : (
        leading
      )}
      <span>{children}</span>
      {!loading ? trailing : null}
    </button>
  );
});
