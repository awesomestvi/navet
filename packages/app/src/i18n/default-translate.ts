import type { TranslateFn, TranslationValues } from './i18n-provider';
import { enMessages } from './messages/en';

/** English translator for non-React model builders and deterministic tests. */
export const defaultTranslate: TranslateFn = (key, values?: TranslationValues) => {
  const template = enMessages[key] ?? key;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values?.[name];
    return value === undefined ? match : String(value);
  });
};
