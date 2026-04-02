import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

// Status: proposed. Simple semantic radio primitive for single-choice groups.
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, style, ...props },
  ref
) {
  const { accentColor } = useTheme();

  return (
    <input
      {...props}
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 accent-current disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{ accentColor, ...style }}
    />
  );
});
