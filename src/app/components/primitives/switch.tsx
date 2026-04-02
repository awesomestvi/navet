import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'aria-checked' | 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

// Status: proposed. Minimal switch primitive for boolean settings where checkbox semantics read awkwardly.
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, disabled, ...props },
  ref
) {
  const { theme, accentColor } = useTheme();

  return (
    <button
      {...props}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      className={cn(
        'inline-flex h-7 w-12 items-center rounded-full border px-1 outline-none transition-[background-color,border-color,box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        theme === 'light'
          ? 'focus-visible:ring-gray-400 focus-visible:ring-offset-white'
          : 'focus-visible:ring-white/30 focus-visible:ring-offset-transparent',
        checked
          ? 'border-transparent'
          : theme === 'light'
            ? 'border-gray-300 bg-gray-200'
            : theme === 'black'
              ? 'border-white/16 bg-zinc-950'
              : theme === 'glass'
                ? 'border-white/16 bg-white/8'
                : 'border-zinc-800 bg-zinc-900',
        className
      )}
      style={checked ? { backgroundColor: accentColor } : undefined}
    >
      <span
        className={cn(
          'h-5 w-5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
});
