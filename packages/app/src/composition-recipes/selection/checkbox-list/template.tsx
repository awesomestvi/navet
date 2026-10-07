import { SelectableCheckboxList, SelectableCheckboxRow } from '@navet/app/ui-kit/patterns';
import { BodyText } from '@navet/app/ui-kit/primitives';

export interface CheckboxListProps {
  label: string;
  emptyLabel: string;
  items: readonly {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    disabled?: boolean;
  }[];
  onCheckedChange: (id: string, checked: boolean) => void;
}
export function CheckboxList({ label, emptyLabel, items, onCheckedChange }: CheckboxListProps) {
  if (!items.length)
    return (
      <div role="status">
        <BodyText>{emptyLabel}</BodyText>
      </div>
    );
  return (
    <SelectableCheckboxList aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <SelectableCheckboxRow
            label={item.label}
            description={item.description}
            checked={item.checked}
            disabled={item.disabled}
            onCheckedChange={(checked) => onCheckedChange(item.id, checked)}
          />
        </li>
      ))}
    </SelectableCheckboxList>
  );
}
