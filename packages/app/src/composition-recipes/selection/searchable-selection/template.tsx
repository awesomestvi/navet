import { BodyText, Button, Combobox, SurfacePanel } from '@navet/app/ui-kit/primitives';
import { useId, useRef, useState } from 'react';

export interface SearchableSelectionProps {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  // Feature supplies filtered, capability-aware options with unique stable IDs.
  options: readonly { id: string; label: string; disabled?: boolean }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  emptyLabel: string;
  disabled?: boolean;
}
export function SearchableSelection({
  label,
  query,
  onQueryChange,
  options,
  selectedId,
  onSelect,
  emptyLabel,
  disabled,
}: SearchableSelectionProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [highlighted, setHighlighted] = useState<string | undefined>();
  const available = options.filter((option) => !option.disabled);
  const active = available.find((option) => option.id === highlighted);
  const activeIndex = options.findIndex((option) => option.id === active?.id);
  const select = (value: string) => {
    onSelect(value);
    setExpanded(false);
    setHighlighted(undefined);
  };
  return (
    <div ref={rootRef}>
      <Combobox
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget)) setExpanded(false);
        }}
        aria-label={label}
        value={query}
        disabled={disabled}
        expanded={expanded && !disabled}
        listboxId={`${id}-list`}
        aria-activedescendant={expanded && active ? `${id}-option-${activeIndex}` : undefined}
        popupClassName="border-0 bg-transparent p-0 backdrop-blur-none"
        onFocus={() => setExpanded(true)}
        onClick={() => setExpanded(true)}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setExpanded(true);
          setHighlighted(undefined);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(false);
            setHighlighted(undefined);
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setExpanded(true);
            const current = available.findIndex((option) => option.id === active?.id);
            const next =
              current < 0
                ? event.key === 'ArrowDown'
                  ? 0
                  : available.length - 1
                : (current + (event.key === 'ArrowDown' ? 1 : -1) + available.length) %
                  available.length;
            setHighlighted(available[next]?.id);
          }
          if (event.key === 'Enter' && expanded && active) {
            event.preventDefault();
            select(active.id);
          }
        }}
      >
        <SurfacePanel padding="sm">
          {options.length ? (
            options.map((option, index) => (
              <Button
                key={option.id}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={selectedId === option.id}
                aria-disabled={option.disabled}
                disabled={option.disabled}
                variant={active?.id === option.id ? 'soft' : 'ghost'}
                className="w-full justify-start whitespace-normal text-left"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => select(option.id)}
              >
                {option.label}
              </Button>
            ))
          ) : (
            <div role="status">
              <BodyText>{emptyLabel}</BodyText>
            </div>
          )}
        </SurfacePanel>
      </Combobox>
    </div>
  );
}
