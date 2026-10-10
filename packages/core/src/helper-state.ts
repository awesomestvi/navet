import type { NavetEntity } from './types';

interface HelperStateBase {
  writable: boolean;
}

export type NavetHelperState =
  | (HelperStateBase & {
      helperType: 'number';
      value: number | null;
      min: number;
      max: number;
      step: number;
      unit?: string;
    })
  | (HelperStateBase & { helperType: 'select'; value: string | null; options: string[] })
  | (HelperStateBase & {
      helperType: 'text';
      value: string | null;
      minLength: number;
      maxLength: number;
      pattern?: string;
      mode: 'text' | 'password';
    })
  | (HelperStateBase & {
      helperType: 'date' | 'time' | 'datetime';
      value: string | null;
      /** Explicit zone for the displayed wall-clock value, when the backend defines one. */
      timeZone?: string;
    });

/** Reads the normalized helper contract; raw provider attributes are never accepted. */
export function readNavetHelperState(
  entity: NavetEntity | undefined
): NavetHelperState | undefined {
  if (entity?.type !== 'helper') return undefined;
  const state = entity.attributes;
  const capability =
    state.helperType === 'number'
      ? 'number_value'
      : state.helperType === 'select'
        ? 'select_option'
        : state.helperType === 'text'
          ? 'text_value'
          : 'datetime_value';
  const writable =
    state.writable === true &&
    entity.availability === 'available' &&
    entity.capabilities.includes(capability);
  const stringValue = typeof state.value === 'string' ? state.value : null;
  switch (state.helperType) {
    case 'number':
      if (
        typeof state.min !== 'number' ||
        !Number.isFinite(state.min) ||
        typeof state.max !== 'number' ||
        !Number.isFinite(state.max) ||
        state.min > state.max ||
        typeof state.step !== 'number' ||
        !Number.isFinite(state.step) ||
        state.step <= 0
      )
        return undefined;
      return {
        helperType: 'number',
        writable,
        value: typeof state.value === 'number' && Number.isFinite(state.value) ? state.value : null,
        min: state.min,
        max: state.max,
        step: state.step,
        unit: typeof state.unit === 'string' ? state.unit : undefined,
      };
    case 'select':
      if (
        !Array.isArray(state.options) ||
        !state.options.every((option) => typeof option === 'string')
      )
        return undefined;
      return {
        helperType: 'select',
        writable: writable && state.options.length > 0,
        value: stringValue,
        options: [...state.options],
      };
    case 'text':
      if (
        typeof state.minLength !== 'number' ||
        !Number.isInteger(state.minLength) ||
        state.minLength < 0 ||
        typeof state.maxLength !== 'number' ||
        !Number.isInteger(state.maxLength) ||
        state.maxLength < state.minLength
      )
        return undefined;
      return {
        helperType: 'text',
        writable,
        value: stringValue,
        minLength: state.minLength,
        maxLength: state.maxLength,
        pattern: typeof state.pattern === 'string' ? state.pattern : undefined,
        mode: state.mode === 'password' ? 'password' : 'text',
      };
    case 'date':
    case 'time':
    case 'datetime':
      return {
        helperType: state.helperType,
        writable,
        value: stringValue,
        ...(typeof state.timeZone === 'string' ? { timeZone: state.timeZone } : {}),
      };
    default:
      return undefined;
  }
}
