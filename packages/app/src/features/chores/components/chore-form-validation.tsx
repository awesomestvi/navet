import type { ReactNode } from 'react';

export type NumericDraft = number | '';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function numericDraft(value: string): NumericDraft {
  if (value === '') return '';
  return Number(value);
}

export function isBoundedInteger(value: NumericDraft, minimum: number, maximum: number) {
  return (
    value !== '' &&
    Number.isSafeInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function isValidTime(value: string) {
  return TIME_PATTERN.test(value);
}

export function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function commaSeparatedValuesAreValid(value: string, validator: (item: string) => boolean) {
  if (!value.trim()) return true;
  return value.split(',').every((item) => validator(item.trim()));
}

export function isValidTimeList(value: string) {
  return commaSeparatedValuesAreValid(value, isValidTime);
}

export function isValidDateList(value: string) {
  return commaSeparatedValuesAreValid(value, isValidDate);
}

export function ChoreFieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 text-xs text-red-500" role="alert">
      {children}
    </p>
  );
}
