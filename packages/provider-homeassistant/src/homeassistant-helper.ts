import { type NavetHelperState, readNavetHelperState } from '@navet/core/helper-state';
import type { NavetCommand, NavetEntity } from '@navet/core/types';
import type { HassEntity } from 'home-assistant-js-websocket';

export const HOME_ASSISTANT_VALUE_HELPER_DOMAINS = new Set([
  'number',
  'input_number',
  'select',
  'input_select',
  'text',
  'input_text',
  'input_datetime',
  'date',
  'time',
  'datetime',
]);

const finiteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function mapHomeAssistantHelper(entity: HassEntity): NavetHelperState | undefined {
  const domain = entity.entity_id.split('.')[0];
  const attributes = entity.attributes;
  const available = entity.state !== 'unknown' && entity.state !== 'unavailable';
  const value = available ? entity.state : null;
  if (domain === 'number' || domain === 'input_number') {
    const { min, max, step } = attributes;
    const valid =
      finiteNumber(min) && finiteNumber(max) && min <= max && finiteNumber(step) && step > 0;
    const numeric = value === null || value.trim() === '' ? null : Number(value);
    return {
      helperType: 'number',
      writable: available && valid,
      value: numeric !== null && Number.isFinite(numeric) ? numeric : null,
      min: valid ? min : 0,
      max: valid ? max : 0,
      step: valid ? step : 1,
      unit:
        typeof attributes.unit_of_measurement === 'string'
          ? attributes.unit_of_measurement
          : undefined,
    };
  }
  if (domain === 'select' || domain === 'input_select') {
    const valid =
      Array.isArray(attributes.options) &&
      attributes.options.every((option: unknown) => typeof option === 'string');
    const options = valid ? (attributes.options as string[]) : [];
    return { helperType: 'select', writable: available && options.length > 0, value, options };
  }
  if (domain === 'text' || domain === 'input_text') {
    const minLength = attributes.min ?? 0;
    const maxLength = attributes.max ?? (domain === 'input_text' ? 100 : 255);
    const valid =
      Number.isInteger(minLength) &&
      minLength >= 0 &&
      Number.isInteger(maxLength) &&
      maxLength >= minLength &&
      maxLength <= 255;
    let validPattern = true;
    if (typeof attributes.pattern === 'string') {
      try {
        new RegExp(`^(?:${attributes.pattern})$`, 'u');
      } catch {
        validPattern = false;
      }
    }
    return {
      helperType: 'text',
      writable: available && valid && validPattern,
      value,
      minLength: valid ? minLength : 0,
      maxLength: valid ? maxLength : 255,
      mode: attributes.mode === 'password' ? 'password' : 'text',
      pattern: typeof attributes.pattern === 'string' ? attributes.pattern : undefined,
    };
  }
  if (domain === 'date' || domain === 'time')
    return { helperType: domain, writable: available, value };
  if (domain === 'datetime') {
    const instant = value === null ? NaN : Date.parse(value);
    return {
      helperType: 'datetime',
      writable: available,
      timeZone: 'UTC',
      value: Number.isFinite(instant)
        ? new Date(instant).toISOString().slice(0, 19).replace('T', ' ')
        : null,
    };
  }
  if (domain === 'input_datetime') {
    const hasDate = attributes.has_date === true;
    const hasTime = attributes.has_time === true;
    return {
      helperType:
        hasDate && hasTime ? 'datetime' : hasDate ? 'date' : hasTime ? 'time' : 'datetime',
      writable: available && (hasDate || hasTime),
      value,
    };
  }
  return undefined;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function validTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value);
}

export function getHomeAssistantHelperCommandRoute(entity: NavetEntity, command: NavetCommand) {
  const helper = readNavetHelperState(entity);
  const domain = entity.externalId.split('.')[0];
  if (!helper?.writable || !HOME_ASSISTANT_VALUE_HELPER_DOMAINS.has(domain))
    throw new Error('Helper is unavailable or read-only');
  switch (command.type) {
    case 'set_number_value':
      if (
        helper.helperType !== 'number' ||
        !entity.capabilities.includes('number_value') ||
        !finiteNumber(command.value) ||
        command.value < helper.min ||
        command.value > helper.max
      )
        throw new Error('Number value is outside the supported range');
      return { domain, service: 'set_value', data: { value: command.value } };
    case 'select_option':
      if (
        helper.helperType !== 'select' ||
        !entity.capabilities.includes('select_option') ||
        !helper.options.includes(command.option)
      )
        throw new Error('Option is not supported');
      return { domain, service: 'select_option', data: { option: command.option } };
    case 'set_text_value':
      if (
        helper.helperType !== 'text' ||
        !entity.capabilities.includes('text_value') ||
        typeof command.value !== 'string' ||
        [...command.value].length < helper.minLength ||
        [...command.value].length > helper.maxLength
      )
        throw new Error('Text does not meet the supported length');
      if (helper.pattern && !new RegExp(`^(?:${helper.pattern})$`, 'u').test(command.value))
        throw new Error('Text does not match the supported pattern');
      return { domain, service: 'set_value', data: { value: command.value } };
    case 'set_datetime_value': {
      if (
        !['date', 'time', 'datetime'].includes(helper.helperType) ||
        !entity.capabilities.includes('datetime_value') ||
        typeof command.value !== 'string'
      )
        throw new Error('Date or time is not supported');
      const value = command.value.replace('T', ' ');
      if (
        helper.helperType === 'date'
          ? !validDate(value)
          : helper.helperType === 'time'
            ? !validTime(value)
            : !(
                value.length === 19 &&
                validDate(value.slice(0, 10)) &&
                value[10] === ' ' &&
                validTime(value.slice(11))
              )
      )
        throw new Error('Date or time has an invalid format');
      return {
        domain,
        service: domain === 'input_datetime' ? 'set_datetime' : 'set_value',
        data:
          domain === 'datetime'
            ? { datetime: `${value.replace(' ', 'T')}+00:00` }
            : domain === 'input_datetime'
              ? { [helper.helperType]: value }
              : { [domain]: value },
      };
    }
    default:
      throw new Error('Unsupported helper command');
  }
}
