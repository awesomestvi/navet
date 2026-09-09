import { describe, expect, it } from 'vitest';
import {
  isBoundedInteger,
  isValidDate,
  isValidDateList,
  isValidTime,
  isValidTimeList,
  numericDraft,
} from './chore-form-validation';

describe('chore form validation', () => {
  it('keeps blank and malformed numeric drafts invalid instead of coercing them to zero', () => {
    expect(numericDraft('')).toBe('');
    expect(isBoundedInteger(numericDraft(''), 0, 10)).toBe(false);
    expect(isBoundedInteger(numericDraft('1.5'), 0, 10)).toBe(false);
    expect(isBoundedInteger(numericDraft('-1'), 0, 10)).toBe(false);
    expect(isBoundedInteger(numericDraft('11'), 0, 10)).toBe(false);
    expect(isBoundedInteger(numericDraft('10'), 0, 10)).toBe(true);
  });

  it('rejects impossible dates and malformed comma-separated date lists', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDateList('2026-12-24, 2026-12-25')).toBe(true);
    expect(isValidDateList('2026-12-24, nope')).toBe(false);
    expect(isValidDateList('2026-12-24,')).toBe(false);
  });

  it('accepts only 24-hour times and rejects malformed time lists', () => {
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTimeList('08:00, 20:00')).toBe(true);
    expect(isValidTimeList('08:00, 8pm')).toBe(false);
    expect(isValidTimeList('08:00,')).toBe(false);
  });
});
