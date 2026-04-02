import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
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
  intent?: InteractivePillIntent;
  variant?: InteractivePillVariant;
}

export const InteractivePill = forwardRef<HTMLButtonElement, InteractivePillProps>(
  function InteractivePill(
    {
      active = false,
      children,
      className = '',
      intent = 'navigation',
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
          'inline-flex items-center justify-center px-4 py-2 transition-all disabled:cursor-not-allowed disabled:opacity-50',
          navetRadiusTokens.pill,
          navetTypographyTokens.control,
          getThemeFocusRingClassName(theme),
          pillStyles.className,
          className
        )}
        style={{ ...pillStyles.style, ...style }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
