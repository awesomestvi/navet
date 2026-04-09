import { type ButtonHTMLAttributes, type ElementType, forwardRef, type ReactNode } from 'react';
import {
  getInteractivePillStyles,
  type InteractivePillIntent,
  type InteractivePillVariant,
} from '@/app/components/shared/theme/interactive-pill-styles';
import {
  getThemeFocusRingClassName,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

interface InteractivePillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
  className?: string;
  icon?: ElementType;
  intent?: InteractivePillIntent;
  size?: 'default' | 'small' | 'compact';
  variant?: InteractivePillVariant;
}

export const InteractivePill = forwardRef<HTMLButtonElement, InteractivePillProps>(
  function InteractivePill(
    {
      active = false,
      children,
      className = '',
      icon: Icon,
      intent = 'navigation',
      size = 'default',
      variant = 'default',
      style,
      ...props
    },
    ref
  ) {
    const { theme, primaryColor } = useTheme();
    const pillStyles = getInteractivePillStyles({
      intent,
      isActive: active,
      primaryColor,
      theme,
      variant,
    });

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          size === 'compact'
            ? 'inline-flex min-h-7 items-center justify-center gap-1.5 px-2 py-1 text-[12px] transition-all disabled:cursor-not-allowed disabled:opacity-50'
            : size === 'small'
              ? 'inline-flex h-9 items-center justify-center gap-1.5 px-3 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50'
              : 'inline-flex h-10 items-center justify-center gap-1.5 px-4 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50',
          navetRadiusTokens.pill,
          navetTypographyTokens.control,
          getThemeFocusRingClassName(theme),
          pillStyles.className,
          className
        )}
        style={{ ...pillStyles.style, ...style }}
        {...props}
      >
        {Icon && <Icon className={size === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
        {children}
      </button>
    );
  }
);
