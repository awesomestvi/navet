import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import {
  getThemeFocusRingClassName,
  navetIconSizeTokens,
  navetRadiusTokens,
  navetSizeTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  icon: ReactNode;
  size?: 'small' | 'medium';
  variant?: 'subtle' | 'ghost';
  loading?: boolean;
}

// Status: in-progress. Icon-only button for compact toolbar and dialog actions.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    size = 'medium',
    variant = 'subtle',
    loading = false,
    className,
    disabled,
    ...props
  },
  ref
) {
  const { theme, accentColor } = useTheme();
  const isDisabled = disabled || loading;
  const sizeClassName =
    size === 'small' ? navetSizeTokens.iconButton.sm : navetSizeTokens.iconButton.md;
  const variantClassName =
    variant === 'subtle'
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
      aria-label={label}
      title={label}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow,opacity] disabled:cursor-not-allowed disabled:opacity-50',
        sizeClassName,
        navetRadiusTokens.pill,
        variantClassName,
        getThemeFocusRingClassName(theme),
        className
      )}
      style={loading ? { borderColor: accentColor } : undefined}
    >
      {loading ? (
        <Loader2 className={`${navetIconSizeTokens.sm} animate-spin`} aria-hidden="true" />
      ) : (
        icon
      )}
    </button>
  );
});
