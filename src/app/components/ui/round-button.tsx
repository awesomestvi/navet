import { type ButtonHTMLAttributes, memo, type ReactNode } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';

interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: CardSize;
  variant?: 'default' | 'primary';
  className?: string;
}

/**
 * Reusable round button component
 * Provides consistent button styling across all cards
 */
export const RoundButton = memo(function RoundButton({
  children,
  size = 'medium',
  variant = 'default',
  className = '',
  disabled,
  onClick,
  ...props
}: RoundButtonProps) {
  const sizeClasses = {
    'extra-small': 'w-7 h-7',
    small: 'w-7 h-7',
    medium: 'w-8 h-8',
    'medium-vertical': 'w-8 h-8',
    large: 'w-12 h-12',
    hero: 'w-12 h-12',
  };

  const variantClasses = {
    default: 'bg-white/10 hover:bg-white/20',
    primary: 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses[size]} rounded-full ${variantClasses[variant]} transition-all flex items-center justify-center disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
