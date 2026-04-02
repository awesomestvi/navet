import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getRoundControlStyles } from '@/app/components/shared/theme/round-control-styles';
import type { ThemeType } from '@/app/hooks/use-theme';

interface RoundControlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme: ThemeType;
  size?: CardSize | 'large';
  variant?: 'neutral' | 'soft' | 'emphasis';
  iconClassName?: string;
  className?: string;
  children: ReactNode;
}

export const RoundControlButton = forwardRef<HTMLButtonElement, RoundControlButtonProps>(
  function RoundControlButton(
    {
      theme,
      size = 'medium',
      variant = 'neutral',
      iconClassName = '',
      className = '',
      children,
      ...props
    },
    ref
  ) {
    const controlSizes = getCardActionControlSizes(size);
    const styles = getRoundControlStyles(theme);
    const buttonClasses =
      variant === 'emphasis'
        ? styles.emphasisButton
        : variant === 'soft'
          ? styles.softButton
          : styles.defaultButton;
    const iconClasses =
      variant === 'emphasis'
        ? styles.emphasisIcon
        : variant === 'soft'
          ? styles.softIcon
          : styles.defaultIcon;
    const resolvedAriaLabel =
      props['aria-label'] ?? (typeof props.title === 'string' ? props.title : undefined);

    return (
      <button
        ref={ref}
        type="button"
        aria-label={resolvedAriaLabel}
        className={`${controlSizes.button} flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ${buttonClasses} ${className}`}
        {...props}
      >
        <span
          className={`flex h-full w-full items-center justify-center leading-none ${iconClasses} ${iconClassName}`}
        >
          {children}
        </span>
      </button>
    );
  }
);
