import { CardDialogSection, FieldBlock } from '@navet/app/ui-kit/patterns';
import { Input } from '@navet/app/ui-kit/primitives';
import { useId } from 'react';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  fields: readonly {
    key: string;
    label: string;
    value: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    onValueChange: (value: string) => void;
  }[];
}
export function SettingsSection({ title, description, fields }: SettingsSectionProps) {
  const id = useId();
  return (
    <CardDialogSection label={title} helperText={description}>
      <div className="space-y-4">
        {fields.map((field, index) => {
          const inputId = `${id}-${index}`;
          const message = field.error ?? field.hint;
          return (
            <FieldBlock
              key={field.key}
              label={field.label}
              htmlFor={inputId}
              required={field.required}
              hint={field.hint ? <span id={`${inputId}-message`}>{field.hint}</span> : undefined}
              error={field.error ? <span id={`${inputId}-message`}>{field.error}</span> : undefined}
            >
              <Input
                id={inputId}
                value={field.value}
                required={field.required}
                disabled={field.disabled}
                invalid={Boolean(field.error)}
                aria-describedby={message ? `${inputId}-message` : undefined}
                onChange={(event) => field.onValueChange(event.target.value)}
              />
            </FieldBlock>
          );
        })}
      </div>
    </CardDialogSection>
  );
}
