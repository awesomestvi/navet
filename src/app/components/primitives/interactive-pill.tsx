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

const INTERACTIVE_PILL_SIZE_CLASS_NAMES = {
  default: {
    frame: 'h-10 gap-1.5 px-4',
    icon: 'h-4 w-4',
    text: navetTypographyTokens.control,
  },
  small: {
    frame: 'h-9 gap-1.5 px-3.5',
    icon: 'h-4 w-4',
    text: navetTypographyTokens.control,
  },
  compact: {
    frame: 'h-8 gap-1 px-3',
    icon: 'h-3.5 w-3.5',
    text: navetTypographyTokens.dense,
  },
} as const;

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
    const sizeClassName = INTERACTIVE_PILL_SIZE_CLASS_NAMES[size];
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
          'inline-flex items-center justify-center transition-all disabled:cursor-not-allowed disabled:opacity-50',
          sizeClassName.frame,
          navetRadiusTokens.pill,
          sizeClassName.text,
          getThemeFocusRingClassName(theme),
          pillStyles.className,
          className
        )}
        style={{ ...pillStyles.style, ...style }}
        {...props}
      >
        {Icon && <Icon className={sizeClassName.icon} />}
        {children}
      </button>
    );
  }
);
