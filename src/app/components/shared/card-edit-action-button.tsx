import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import type { CardSize } from '@/app/components/shared/card-size';
import {
  type EditControlPlacement,
  type EditControlVariant,
  getEditControlButtonClass,
  getEditControlLayout,
} from '@/app/components/shared/edit-card-controls';

interface CardEditActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  cardSize: CardSize;
  Icon: LucideIcon;
  placement: EditControlPlacement;
  variant?: EditControlVariant;
  className?: string;
}

export const CardEditActionButton = forwardRef<HTMLButtonElement, CardEditActionButtonProps>(
  function CardEditActionButton(
    { cardSize, Icon, placement, variant = 'neutral', className = '', ...props },
    ref
  ) {
    const layout = getEditControlLayout(cardSize);
    const positionClass =
      placement === 'top-left' ? layout.topLeftPosition : layout.topRightPosition;

    return (
      <button
        ref={ref}
        type="button"
        className={`absolute ${positionClass} z-500 ${layout.buttonSize} ${getEditControlButtonClass(variant)} ${className}`}
        {...props}
      >
        <Icon className={`${layout.iconSize} text-white`} />
      </button>
    );
  }
);

CardEditActionButton.displayName = 'CardEditActionButton';
