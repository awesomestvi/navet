import {
  getInteractivePillStyles,
  type InteractivePillIntent,
  type InteractivePillVariant,
} from '@navet/app/components/shared/theme/interactive-pill-styles';
import {
  getThemeFocusRingClassName,
  navetRadiusTokens,
} from '@navet/app/components/system/tokens/foundations';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { type ButtonHTMLAttributes, type ElementType, forwardRef, type ReactNode } from 'react';

interface InteractivePillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  accentColor?: string;
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
    frame: 'h-9 gap-1 px-3.5 md:h-10 md:gap-1.5 md:px-4',
    icon: 'h-3.5 w-3.5 md:h-4 md:w-4',
    text: 'text-xs font-medium leading-5 md:text-sm',
  },
  small: {
    frame: 'h-8 gap-1 px-3 md:h-9 md:gap-1.5 md:px-3.5',
    icon: 'h-3.5 w-3.5 md:h-4 md:w-4',
    text: 'text-xs font-medium leading-5 md:text-sm',
  },
  compact: {
    frame: 'h-[30px] gap-1 px-2.5 md:h-8 md:px-3',
    icon: 'h-3.5 w-3.5',
    text: 'text-xs leading-4 md:leading-5',
  },
} as const;

export const InteractivePill = forwardRef<HTMLButtonElement, InteractivePillProps>(
  function InteractivePill(
    {
      accentColor,
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
      accentColor,
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
