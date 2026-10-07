import { FieldBlock } from '@navet/app/ui-kit/patterns';
import { Input } from '@navet/app/ui-kit/primitives';
import { useId } from 'react';

export interface SettingsFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SettingsField({
  label,
  value,
  onValueChange,
  hint,
  error,
  required = false,
  disabled = false,
}: SettingsFieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  return (
    <FieldBlock
      label={label}
      htmlFor={inputId}
      required={required}
      hint={hint ? <span id={messageId}>{hint}</span> : undefined}
      error={error ? <span id={messageId}>{error}</span> : undefined}
    >
      <Input
        id={inputId}
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
      />
    </FieldBlock>
  );
}
