import { Checkbox, type CheckboxProps } from '@navet/app/components/primitives/checkbox';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { type CSSProperties, type HTMLAttributes, type ReactNode, useId } from 'react';

export type SelectableCheckboxListProps = HTMLAttributes<HTMLUListElement>;

export function SelectableCheckboxList({
  children,
  className,
  ...props
}: SelectableCheckboxListProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <ul
      className={cn(
        'min-w-0 max-w-full divide-y overflow-x-hidden rounded-[24px] border',
        surface.border,
        surface.divider,
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

export interface SelectableCheckboxRowProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  action?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  rowClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  checkboxClassName?: string;
  checkboxAppearance?: CheckboxProps['appearance'];
  checkboxPalette?: CheckboxProps['palette'];
  checkboxPaletteColor?: string | null;
  style?: CSSProperties;
  selectedStyle?: CSSProperties;
  unselectedStyle?: CSSProperties;
  selectedClassName?: string;
  unselectedClassName?: string;
}

export function SelectableCheckboxRow({
  checked,
  onCheckedChange,
  label,
  description,
  leading,
  trailing,
  action,
  disabled = false,
  id,
  className,
  rowClassName,
  labelClassName,
  descriptionClassName,
  checkboxClassName,
  checkboxAppearance = 'default',
  checkboxPalette = 'accent',
  checkboxPaletteColor = null,
  style,
  selectedStyle,
  unselectedStyle,
  selectedClassName,
  unselectedClassName,
}: SelectableCheckboxRowProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const handleCheckedChange = (value: CheckedState) => {
    onCheckedChange(Boolean(value));
  };

  return (
    <div
      className={cn(
        'flex min-h-14 min-w-0 max-w-full items-center gap-3 px-4 py-3 transition-colors motion-reduce:transition-none',
        surface.textPrimary,
        surface.hoverBg,
        disabled && 'opacity-50',
        className,
        rowClassName,
        checked ? selectedClassName : unselectedClassName
      )}
      style={{
        ...style,
        ...(checked ? selectedStyle : unselectedStyle),
      }}
    >
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          <Checkbox
            id={checkboxId}
            checked={checked}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            appearance={checkboxAppearance}
            palette={checkboxPalette}
            paletteColor={checkboxPaletteColor}
            className={cn('shrink-0', checkboxClassName)}
          />
        </span>

        {leading ? <div className="shrink-0">{leading}</div> : null}

        <div className="min-w-0 flex-1">
          <div className={cn('min-w-0 text-sm font-medium', labelClassName)}>{label}</div>
          {description ? (
            <div
              className={cn('mt-0.5 min-w-0 text-xs', surface.textSecondary, descriptionClassName)}
            >
              {description}
            </div>
          ) : null}
        </div>

        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </label>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
