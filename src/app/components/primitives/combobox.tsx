import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { Input, type InputProps } from './input';

export interface ComboboxProps extends Omit<InputProps, 'trailing'> {
  expanded: boolean;
  listboxId: string;
  containerClassName?: string;
  popupClassName?: string;
  children?: ReactNode;
}

// Status: proposed. Structural combobox wrapper only; filtering, option state, and selection logic stay outside.
// TODO: Add shared keyboard option navigation only after the app proves one stable interaction model.
export function Combobox({
  expanded,
  listboxId,
  containerClassName,
  popupClassName,
  children,
  ...props
}: ComboboxProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Input
        {...props}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        trailing={<ChevronDown className="h-4 w-4 text-current/60" aria-hidden="true" />}
      />
      {expanded ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            'absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-[22px] border border-white/12 bg-zinc-950/95 p-2 backdrop-blur-xl',
            popupClassName
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
