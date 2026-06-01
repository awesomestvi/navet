import type { CardSize } from '@navet/app/components/shared/card-size';
import {
  type EditControlPlacement,
  type EditControlVariant,
  getEditControlButtonClass,
  getEditControlLayout,
} from '@navet/app/components/shared/edit-card-controls';
import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface CardEditActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  cardSize: CardSize;
  Icon: LucideIcon;
  placement?: EditControlPlacement;
  variant?: EditControlVariant;
  className?: string;
  inline?: boolean;
}

export const CardEditActionButton = forwardRef<HTMLButtonElement, CardEditActionButtonProps>(
  function CardEditActionButton(
    { cardSize, Icon, placement, variant = 'neutral', className = '', inline = false, ...props },
    ref
  ) {
    const layout = getEditControlLayout(cardSize);
    const positionClass = {
      'top-left': layout.topLeftPosition,
      'top-right': layout.topRightPosition,
      'bottom-left': layout.bottomLeftPosition,
      'bottom-right': layout.bottomRightPosition,
    }[placement ?? 'top-right'];

    return (
      <button
        ref={ref}
        type="button"
        className={`${inline ? '' : `absolute ${positionClass} z-500`} ${layout.buttonSize} ${getEditControlButtonClass(variant)} ${className}`}
        {...props}
      >
        <Icon className={`${layout.iconSize} text-white`} />
      </button>
    );
  }
);

CardEditActionButton.displayName = 'CardEditActionButton';
