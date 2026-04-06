import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';
import { getThemeFocusRingClassName, navetIconSizeTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface CheckboxProps
  extends Omit<ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'children' | 'asChild'> {}

// Status: proposed. Canonical checkbox primitive for compact form rows and list selection.
export const Checkbox = forwardRef<ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  function Checkbox({ className, disabled, ...props }, ref) {
    const { theme, accentColor } = useTheme();

    const uncheckedClassName =
      theme === 'light'
        ? 'border-gray-300 bg-white hover:border-gray-400'
        : theme === 'black'
          ? 'border-white/16 bg-zinc-950 hover:border-white/24'
          : theme === 'glass'
            ? 'border-white/18 bg-white/8 hover:border-white/26'
            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700';

    return (
      <CheckboxPrimitive.Root
        {...props}
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center border outline-none transition-[background-color,border-color,box-shadow,opacity] data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--checkbox-accent)] data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-50',
          'rounded-[6px]',
          getThemeFocusRingClassName(theme),
          uncheckedClassName,
          className
        )}
        style={{
          ['--checkbox-accent' as string]: accentColor,
        }}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className={navetIconSizeTokens.xs} strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);
