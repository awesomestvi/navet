export const SUPPORTED_LANGUAGES = ['en', 'sv', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'zh'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type AppLanguageOption = {
  value: AppLanguage;
  label: string;
};

export const LANGUAGE_OPTIONS: AppLanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pt', label: 'Português' },
  { value: 'zh', label: '简体中文' },
];

const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  en: 'en-US',
  sv: 'sv-SE',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  nl: 'nl-NL',
  pt: 'pt-BR',
  zh: 'zh-CN',
};

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

function resolveSupportedLanguage(value: string | null | undefined): AppLanguage | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (isSupportedLanguage(normalized)) {
    return normalized;
  }

  const languageCode = normalized.split(/[-_]/)[0];
  return isSupportedLanguage(languageCode) ? languageCode : null;
}

export function resolveAppLanguage(value: string | null | undefined): AppLanguage {
  return resolveSupportedLanguage(value) ?? 'en';
}

export function getNavigatorLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const languageSources = [navigator.language, ...(navigator.languages ?? [])];
  for (const candidate of languageSources) {
    const resolved = resolveSupportedLanguage(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return 'en';
}

export function getLocaleForLanguage(language: AppLanguage): string {
  return LOCALE_BY_LANGUAGE[language];
}
