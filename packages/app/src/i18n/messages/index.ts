import { deMessages } from './de';
import { enMessages } from './en';
import { esMessages } from './es';
import { frMessages } from './fr';
import { itMessages } from './it';
import { ptMessages } from './pt';
import { svMessages } from './sv';
import { zhMessages } from './zh';

export type TranslationKey = keyof typeof enMessages;

export const MESSAGES = {
  en: enMessages,
  sv: svMessages,
  de: deMessages,
  fr: frMessages,
  es: esMessages,
  it: itMessages,
  pt: ptMessages,
  zh: zhMessages,
} as const satisfies Record<string, Record<TranslationKey, string>>;
