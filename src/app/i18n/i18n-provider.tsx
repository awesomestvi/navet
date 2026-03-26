import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useSettingsStore } from '@/app/stores';
import {
  type AppLanguage,
  getLocaleForLanguage,
  LANGUAGE_OPTIONS,
  resolveAppLanguage,
} from './config';
import { MESSAGES, type TranslationKey } from './messages';

export type TranslationValues = Record<string, string | number>;
export type TranslateFn = (key: TranslationKey, values?: TranslationValues) => string;

type I18nContextValue = {
  language: AppLanguage;
  locale: string;
  languageOptions: typeof LANGUAGE_OPTIONS;
  t: TranslateFn;
  formatDate: (value: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (
    value: Date,
    options?: Omit<Intl.DateTimeFormatOptions, 'hour12'>,
    hour12?: boolean
  ) => string;
  formatDateTime: (value: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const interpolateMessage = (template: string, values?: TranslationValues) => {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(values[token] ?? `{${token}}`)
  );
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useSettingsStore((state) => resolveAppLanguage(state.language));
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);

  const value = useMemo<I18nContextValue>(() => {
    const locale = getLocaleForLanguage(language);
    const dictionary = MESSAGES[language];

    return {
      language,
      locale,
      languageOptions: LANGUAGE_OPTIONS,
      t: (key, values) => interpolateMessage(dictionary[key] ?? MESSAGES.en[key] ?? key, values),
      formatDate: (date, options) => new Intl.DateTimeFormat(locale, options).format(date),
      formatTime: (date, options, hour12 = !use24HourTime) =>
        new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          ...options,
          hour12,
        }).format(date),
      formatDateTime: (date, options) => new Intl.DateTimeFormat(locale, options).format(date),
      formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
      formatRelativeTime: (value, unit) => new Intl.RelativeTimeFormat(locale).format(value, unit),
    };
  }, [language, use24HourTime]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
