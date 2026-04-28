import { Check, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FieldBlock } from '@/app/components/patterns';
import { Combobox } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';
import { filterEnergyEntityOptions } from './energy-setup-wizard.helpers';
import type { EnergyEntityOption } from './energy-setup-wizard.types';

interface EnergyEntityPickerProps {
  label: string;
  hint: string;
  placeholder: string;
  value: string | undefined;
  options: EnergyEntityOption[];
  onChange: (value: string) => void;
  emptyMessage: string;
}

export function EnergyEntityPicker({
  label,
  hint,
  placeholder,
  value,
  options,
  onChange,
  emptyMessage,
}: EnergyEntityPickerProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );
  const [query, setQuery] = useState(selectedOption?.label ?? '');
  const visibleOptions = useMemo(() => filterEnergyEntityOptions(options, query), [options, query]);

  useEffect(() => {
    setQuery(selectedOption?.label ?? '');
  }, [selectedOption]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
        setQuery(selectedOption?.label ?? '');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [expanded, selectedOption]);

  return (
    <FieldBlock label={label} hint={hint}>
      <div ref={rootRef}>
        <Combobox
          expanded={expanded}
          listboxId={listboxId}
          value={query}
          onFocus={() => setExpanded(true)}
          onClick={() => setExpanded(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setExpanded(false);
              setQuery(selectedOption?.label ?? '');
            }, 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!expanded) {
              setExpanded(true);
            }
          }}
          placeholder={placeholder}
          leading={<Search className="h-4 w-4" />}
          containerClassName="w-full"
          inputClassName={`${surface.border} ${surface.inputBg} ${surface.textPrimary}`}
          popupClassName={cn(
            surface.border,
            theme === 'light' ? 'bg-white/96' : theme === 'black' ? 'bg-black/96' : 'bg-zinc-950/94'
          )}
        >
          {visibleOptions.length > 0 ? (
            <div className="space-y-1">
              {visibleOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(option.value);
                      setQuery(option.label);
                      setExpanded(false);
                    }}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-[18px] px-3 py-2 text-left transition-colors',
                      theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/8'
                    )}
                  >
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                        {option.label}
                      </div>
                      <div className={`truncate text-xs ${surface.textMuted}`}>
                        {option.description}
                      </div>
                    </div>
                    {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`px-3 py-2 text-sm ${surface.textMuted}`}>{emptyMessage}</div>
          )}
        </Combobox>
      </div>
    </FieldBlock>
  );
}
