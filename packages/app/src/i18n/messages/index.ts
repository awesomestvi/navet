import type { AppLanguage } from '../config';
import { enMessages } from './en';

export type TranslationKey = keyof typeof enMessages;
export type MessageDictionary = Record<TranslationKey, string>;

const loadedMessages = new Map<AppLanguage, MessageDictionary>([['en', enMessages]]);

const MESSAGE_LOADERS: Record<Exclude<AppLanguage, 'en'>, () => Promise<MessageDictionary>> = {
  sv: () => import('./sv').then(({ svMessages }) => svMessages),
  de: () => import('./de').then(({ deMessages }) => deMessages),
  fr: () => import('./fr').then(({ frMessages }) => frMessages),
  es: () => import('./es').then(({ esMessages }) => esMessages),
  it: () => import('./it').then(({ itMessages }) => itMessages),
  nl: () => import('./nl').then(({ nlMessages }) => nlMessages),
  pt: () => import('./pt').then(({ ptMessages }) => ptMessages),
  zh: () => import('./zh').then(({ zhMessages }) => zhMessages),
};

export const DEFAULT_MESSAGES: MessageDictionary = enMessages;

export function getLoadedMessages(language: AppLanguage) {
  return loadedMessages.get(language) ?? null;
}

export async function loadMessages(language: AppLanguage) {
  const loaded = getLoadedMessages(language);
  if (loaded) {
    return loaded;
  }

  if (language === 'en') {
    return DEFAULT_MESSAGES;
  }

  const messages = await MESSAGE_LOADERS[language]();
  loadedMessages.set(language, messages);
  return messages;
}
