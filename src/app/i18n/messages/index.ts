import { deMessages } from './de';
import { enMessages } from './en';
import { esMessages } from './es';
import { frMessages } from './fr';
import { ptMessages } from './pt';
import { svMessages } from './sv';

export type TranslationKey = keyof typeof enMessages;

export const MESSAGES = {
  en: enMessages,
  sv: svMessages,
  de: deMessages,
  fr: frMessages,
  es: esMessages,
  pt: ptMessages,
} as const satisfies Record<string, Record<TranslationKey, string>>;
