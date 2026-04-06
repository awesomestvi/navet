import { forwardRef, type ReactNode } from 'react';
import { Button, type ButtonProps } from '../button';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leading' | 'trailing'> {
  label: string;
  icon: ReactNode;
  size?: 'small' | 'medium';
  variant?: 'subtle' | 'ghost' | 'secondary';
  loading?: boolean;
}

// Status: in-progress. Icon-only button for compact toolbar and dialog actions.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'medium', variant = 'subtle', loading = false, ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      {...props}
      iconOnly
      label={label}
      leading={icon}
      size={size}
      variant={variant}
      loading={loading}
    >
      {icon}
    </Button>
  );
});
