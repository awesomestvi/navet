export const SUPPORTED_LANGUAGES = ['en', 'sv', 'de', 'fr', 'es', 'pt'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type AppLanguageOption = {
  value: AppLanguage;
  label: string;
};

export const LANGUAGE_OPTIONS: AppLanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
  { value: 'es', label: 'Espanol' },
  { value: 'pt', label: 'Portugues' },
];

const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  en: 'en-US',
  sv: 'sv-SE',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-BR',
};

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function resolveAppLanguage(value: string | null | undefined): AppLanguage {
  if (!value) {
    return 'en';
  }

  const normalized = value.trim().toLowerCase();
  if (isSupportedLanguage(normalized)) {
    return normalized;
  }

  const languageCode = normalized.split(/[-_]/)[0];
  return isSupportedLanguage(languageCode) ? languageCode : 'en';
}

export function getNavigatorLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const languageSources = [navigator.language, ...(navigator.languages ?? [])];
  for (const candidate of languageSources) {
    const resolved = resolveAppLanguage(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return 'en';
}

export function getLocaleForLanguage(language: AppLanguage): string {
  return LOCALE_BY_LANGUAGE[language];
}
