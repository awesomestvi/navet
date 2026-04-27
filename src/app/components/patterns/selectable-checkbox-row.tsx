import type { CheckedState } from '@radix-ui/react-checkbox';
import { type CSSProperties, type ReactNode, useId } from 'react';
import { Checkbox, type CheckboxProps } from '@/app/components/primitives';
import { cn } from '@/app/components/ui/utils';

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

  const handleCheckedChange = (value: CheckedState) => {
    onCheckedChange(Boolean(value));
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
          disabled && 'cursor-not-allowed opacity-50',
          rowClassName,
          checked ? selectedClassName : unselectedClassName
        )}
        style={{
          ...style,
          ...(checked ? selectedStyle : unselectedStyle),
        }}
      >
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={handleCheckedChange}
          disabled={disabled}
          appearance={checkboxAppearance}
          palette={checkboxPalette}
          paletteColor={checkboxPaletteColor}
          className={cn('mt-0.5 shrink-0', checkboxClassName)}
        />

        {leading ? <div className="mt-0.5 shrink-0">{leading}</div> : null}

        <div className="min-w-0 flex-1">
          <div className={cn('min-w-0 text-sm font-medium', labelClassName)}>{label}</div>
          {description ? (
            <div className={cn('mt-0.5 min-w-0 text-xs', descriptionClassName)}>{description}</div>
          ) : null}
        </div>

        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </label>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
