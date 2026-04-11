import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { resolvePrimaryColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeFocusRingClassName, navetIconSizeTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';
import type { PrimaryColor } from '@/app/stores/theme-store';

export interface CheckboxProps
  extends Omit<ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'children' | 'asChild'> {
  appearance?: 'default' | 'secondary';
  palette?: 'accent' | PrimaryColor;
  paletteColor?: string | null;
}

// Status: proposed. Canonical checkbox primitive for compact form rows and list selection.
export const Checkbox = forwardRef<ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  function Checkbox(
    {
      appearance = 'default',
      className,
      disabled,
      palette = 'accent',
      paletteColor = null,
      style,
      ...props
    },
    ref
  ) {
    const { theme, accentColor } = useTheme();
    const checkedColor =
      palette === 'accent' ? accentColor : resolvePrimaryColorValue(palette, paletteColor);
    const pickerTokens = getThemeAppearancePickerTokens(theme, checkedColor);

    const uncheckedClassName =
      appearance === 'secondary'
        ? `${pickerTokens.optionBorderClassName} ${pickerTokens.optionCardClassName}`
        : theme === 'light'
          ? 'border-gray-300 bg-white hover:border-gray-400'
          : theme === 'black'
            ? 'border-white/16 bg-zinc-950 hover:border-white/24'
            : theme === 'glass'
              ? 'border-white/18 bg-white/8 hover:border-white/26'
              : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700';
    const checkedClassName =
      appearance === 'secondary'
        ? 'data-[state=checked]:border-[var(--checkbox-accent-border)] data-[state=checked]:bg-[var(--checkbox-accent-tint)] data-[state=checked]:text-white'
        : 'data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--checkbox-accent)] data-[state=checked]:text-white';

    return (
      <CheckboxPrimitive.Root
        {...props}
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center border outline-none transition-[background-color,border-color,box-shadow,opacity] disabled:cursor-not-allowed disabled:opacity-50',
          'rounded-[6px]',
          getThemeFocusRingClassName(theme),
          checkedClassName,
          uncheckedClassName,
          className
        )}
        style={{
          ['--checkbox-accent' as string]: checkedColor,
          ['--checkbox-accent-border' as string]: `${checkedColor}80`,
          ['--checkbox-accent-tint' as string]: theme === 'black' ? '#000000' : `${checkedColor}14`,
          ...style,
        }}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className={navetIconSizeTokens.xs} strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);
