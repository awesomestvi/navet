import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import {
  getInteractivePillStyles,
  type InteractivePillIntent,
} from '@/app/components/shared/theme/interactive-pill-styles';
import { useTheme } from '@/app/hooks';

interface InteractivePillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
  className?: string;
  intent?: InteractivePillIntent;
}

export const InteractivePill = forwardRef<HTMLButtonElement, InteractivePillProps>(
  function InteractivePill(
    { active = false, children, className = '', intent = 'navigation', style, ...props },
    ref
  ) {
    const { theme, primaryColor } = useTheme();
    const pillStyles = getInteractivePillStyles({
      intent,
      isActive: active,
      primaryColor,
      theme,
    });

    return (
      <button
        ref={ref}
        type="button"
        className={`${pillStyles.className} ${className}`.trim()}
        style={{ ...pillStyles.style, ...style }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
