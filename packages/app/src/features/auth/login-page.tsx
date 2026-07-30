import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogo from '@navet/app/assets/providers/homey.svg';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { useAuthSession } from '@navet/app/auth/AuthProvider';
import {
  chooseDiscoveredHomeAssistantUrl,
  fetchHomeAssistantDiscovery,
} from '@navet/app/auth/homeAssistantDiscovery';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { getRuntimeConfig } from '@navet/app/config/runtime-config';
import { type TranslationKey, useI18n } from '@navet/app/i18n';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import {
  INTEGRATION_PROVIDER_IDS,
  INTEGRATION_PROVIDERS,
  type IntegrationProviderId,
} from '@navet/app/types/provider';
import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import { type SVGProps, useEffect, useRef, useState } from 'react';

type LoginIconProps = SVGProps<SVGSVGElement>;

const loginIconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

function AlertCircle(props: LoginIconProps) {
  return (
    <svg {...loginIconProps} {...props}>
      <title>Alert</title>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ArrowRight(props: LoginIconProps) {
  return (
    <svg {...loginIconProps} {...props}>
      <title>Continue</title>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckCircle2(props: LoginIconProps) {
  return (
    <svg {...loginIconProps} {...props}>
      <title>Selected</title>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function Home(props: LoginIconProps) {
  return (
    <svg {...loginIconProps} {...props}>
      <title>Home</title>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function Languages(props: LoginIconProps) {
  return (
    <svg {...loginIconProps} {...props}>
      <title>Language</title>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="m14 19 4-9 4 9" />
      <path d="M16 15h4" />
    </svg>
  );
}

function Loader2(props: LoginIconProps) {
  return (
    <svg {...loginIconProps} {...props}>
      <title>Loading</title>
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </svg>
  );
}

const PROVIDER_OPTION_CONTENT: Record<
  IntegrationProviderId,
  {
    detailKey: TranslationKey;
    logoSrc: string;
    logoSources?: ReadonlyArray<{
      srcSet: string;
      type: 'image/avif' | 'image/webp';
    }>;
  }
> = {
  home_assistant: {
    detailKey: 'login.providers.home_assistant.detail',
    logoSrc: homeAssistantLogo,
  },
  homey: {
    detailKey: 'login.providers.homey.detail',
    logoSrc: homeyLogo,
  },
  openhab: {
    detailKey: 'login.providers.openhab.detail',
    logoSrc: openhabLogo,
  },
  hubitat: {
    detailKey: 'login.providers.unavailable.detail',
    logoSrc: '',
  },
  smartthings: {
    detailKey: 'login.providers.unavailable.detail',
    logoSrc: '',
  },
};

export function LoginPage({ initialError = '' }: { initialError?: string }) {
  const selectableProviders = INTEGRATION_PROVIDER_IDS.filter(
    (candidateId) => INTEGRATION_PROVIDERS[candidateId].loginMode !== 'unavailable'
  );
  const initialUrl = useRef(getRuntimeConfig().hassUrl ?? '');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(!initialUrl.current);
  const [discoveredUrl, setDiscoveredUrl] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<IntegrationProviderId | null>(null);
  const [openhabUsername, setOpenhabUsername] = useState('');
  const [openhabPassword, setOpenhabPassword] = useState('');
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window === 'undefined'
      ? true
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches !== false
  );
  const { login } = useAuthSession();
  const configuredTheme = useThemeStore((state) => state.theme);
  const followSystemTheme = useThemeStore((state) => state.followSystemTheme);
  const theme = followSystemTheme ? (systemPrefersDark ? 'dark' : 'light') : configuredTheme;
  const { language, languageOptions, t } = useI18n();
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const provider = providerId ? INTEGRATION_PROVIDERS[providerId] : null;
  const requiresUrl = provider?.loginMode === 'url_oauth' || provider?.loginMode === 'url_session';
  const usesOAuthRedirect =
    provider?.loginMode === 'url_oauth' || provider?.loginMode === 'cloud_oauth';
  const requiresCredentials = provider?.id === 'openhab';
  const hasSelectedProvider = provider !== null;
  const surface = getThemeSurfaceTokens(theme);
  const logoSrc = getPublicAssetUrl('logo.svg');

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) {
      return;
    }

    const handleThemeChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (!provider) {
      setIsDiscovering(false);
      return;
    }

    if (!provider.supportsDiscovery) {
      setIsDiscovering(false);
      return;
    }

    if (initialUrl.current) {
      return;
    }

    let cancelled = false;
    setIsDiscovering(true);
    void fetchHomeAssistantDiscovery()
      .then((result) => {
        if (cancelled) {
          return;
        }

        const suggestedUrl = chooseDiscoveredHomeAssistantUrl(result);
        if (!suggestedUrl) {
          return;
        }

        setDiscoveredUrl(suggestedUrl);
        if (urlInputRef.current && !urlInputRef.current.value.trim()) {
          urlInputRef.current.value = suggestedUrl;
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsDiscovering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!providerId || !provider) {
      return;
    }

    setIsLoading(true);
    try {
      if (!requiresUrl) {
        await login({ providerId });
      } else {
        const hassUrl = urlInputRef.current?.value.trim() ?? '';
        if (!hassUrl) {
          setError(t('login.errors.urlRequired'));
          setIsLoading(false);
          return;
        }

        try {
          new URL(hassUrl);
        } catch (validationError) {
          console.error('[LoginPage] Invalid URL format:', validationError);
          setError(t('login.errors.urlInvalid'));
          setIsLoading(false);
          return;
        }

        if (requiresCredentials) {
          if (!openhabUsername.trim()) {
            setError('Please enter your openHAB username');
            setIsLoading(false);
            return;
          }

          if (!openhabPassword.trim()) {
            setError('Please enter your openHAB password');
            setIsLoading(false);
            return;
          }
        }

        await login({
          providerId,
          hassUrl,
          username: requiresCredentials ? openhabUsername.trim() : undefined,
          password: requiresCredentials ? openhabPassword : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const isLightTheme = theme === 'light';
  const isBlack = theme === 'black';
  const textColor = isLightTheme ? 'text-slate-950' : 'text-white';
  const mutedColor = isLightTheme ? 'text-slate-600' : 'text-white/68';
  const loginPanelSurface = `${surface.border} ${surface.panelMuted} ${surface.cardShadow}`;
  const fieldInputClassName = `${surface.inputBg} ${surface.border} ${textColor} ${surface.placeholder}`;
  const selectedProviderClassName = isLightTheme
    ? 'border-orange-200/80 bg-orange-50/90 text-slate-950 shadow-[0_12px_30px_-24px_rgba(249,115,22,0.28)]'
    : 'border-orange-400/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] text-white shadow-[0_16px_32px_-26px_rgba(249,115,22,0.28)]';
  const pageBackground = isLightTheme
    ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.22)_0%,rgba(249,115,22,0.10)_24%,transparent_46%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]'
    : isBlack
      ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.13)_24%,transparent_46%),linear-gradient(180deg,#050505_0%,#000_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.12)_24%,transparent_46%),linear-gradient(180deg,#060a12_0%,#030712_100%)]';
  const providerSignInLabel = provider?.id === 'homey' ? 'Athom' : provider?.label;
  const translatedHeadingText = provider
    ? t('login.connectProviderTitle', { provider: provider.label })
    : t('login.providerChooser.title');
  const urlFieldLabel = provider
    ? t('login.providerUrlLabel', { provider: provider.label })
    : t('login.urlLabel');
  const urlPlaceholder =
    provider?.id === 'openhab' ? 'http://openhab.local:8080' : t('login.urlPlaceholder');
  const introText = provider
    ? provider.id === 'openhab'
      ? 'Enter your openHAB URL, username, and password to connect directly from Navet.'
      : provider.loginMode === 'url_session'
        ? t('login.providerIntro.urlSession', { provider: provider.label })
        : requiresUrl
          ? t('login.providerIntro.urlOauth', { provider: provider.label })
          : t('login.providerIntro.cloudOauth', { provider: provider.label })
    : t('login.providerChooser.description');

  return (
    <main className={`relative min-h-screen overflow-y-auto ${pageBackground}`}>
      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-5 text-center sm:px-6">
        <div className="w-full">
          <div className="mx-auto flex min-h-20 w-full max-w-[18rem] items-center justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-orange-500/12 blur-xl" />
              <img src={logoSrc} alt="" className="relative z-10 h-20 w-20" />
            </div>
          </div>

          <div className="mx-auto mt-4 h-px w-28 bg-[linear-gradient(90deg,transparent,#f97316,transparent)]" />

          <h1
            className={`mx-auto mt-5 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl ${textColor}`}
          >
            {translatedHeadingText}
          </h1>
          <p className={`mx-auto mt-3 max-w-md text-sm leading-relaxed ${mutedColor}`}>
            {introText}
          </p>

          <form
            onSubmit={handleSubmit}
            className={`relative mx-auto mt-7 w-full max-w-md overflow-hidden rounded-[28px] border ${loginPanelSurface} p-4 text-left backdrop-blur-md sm:p-5`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.10),transparent_30%)] opacity-90"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025)_22%,transparent_58%)]" />
            <div className="relative space-y-5">
              <ul
                className="m-0 flex list-none flex-col gap-2 p-0"
                aria-label={t('login.providerChooser.title')}
              >
                {selectableProviders.map((candidateId) => {
                  const candidateContent = PROVIDER_OPTION_CONTENT[candidateId];
                  const isSelected = candidateId === providerId;
                  const candidate = INTEGRATION_PROVIDERS[candidateId];
                  const isCollapsedOption = hasSelectedProvider && !isSelected;

                  return (
                    <li
                      key={candidateId}
                      className={cn('overflow-hidden', isCollapsedOption ? 'hidden' : 'block')}
                      aria-hidden={isCollapsedOption}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setProviderId(candidateId);
                          setError('');
                        }}
                        aria-label={candidate.label}
                        disabled={isCollapsedOption}
                        className={cn(
                          'group relative flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out',
                          isSelected
                            ? selectedProviderClassName
                            : `border-white/10 ${textColor} hover:border-white/16 hover:bg-white/4`
                        )}
                        aria-pressed={isSelected}
                      >
                        <span
                          className={cn(
                            'ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/15 text-white/80 transition-[background-color,border-color,transform] duration-300 ease-out'
                          )}
                        >
                          {candidateContent.logoSrc ? (
                            candidateContent.logoSources ? (
                              <picture>
                                {candidateContent.logoSources.map((source) => (
                                  <source
                                    key={`${source.type}-${source.srcSet}`}
                                    srcSet={source.srcSet}
                                    type={source.type}
                                  />
                                ))}
                                <img
                                  src={candidateContent.logoSrc}
                                  alt=""
                                  className="h-7 w-7 object-contain"
                                />
                              </picture>
                            ) : (
                              <img
                                src={candidateContent.logoSrc}
                                alt=""
                                className="h-7 w-7 object-contain"
                              />
                            )
                          ) : (
                            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
                              {candidate.label.slice(0, 2)}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold">{candidate.label}</span>
                          <span
                            className={cn(
                              'mt-1 block text-sm leading-5',
                              isSelected ? 'text-white/72' : mutedColor
                            )}
                          >
                            {t(candidateContent.detailKey)}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ease-out',
                            isSelected
                              ? 'scale-[1.03] bg-orange-500/14 text-orange-300'
                              : 'bg-white/5 text-white/55 group-hover:bg-white/10 group-hover:text-white/80'
                          )}
                          aria-hidden="true"
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-400/22 bg-red-500/12 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
                  <p className="text-sm leading-6 text-red-100">{error}</p>
                </div>
              ) : null}
              {hasSelectedProvider && provider ? (
                <div className="space-y-5 pt-5">
                  {requiresUrl ? (
                    <>
                      <div className="space-y-2">
                        <label htmlFor="url" className={`block text-sm font-medium ${textColor}`}>
                          {urlFieldLabel}
                        </label>
                        <div className="relative">
                          <Home
                            className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${mutedColor}`}
                          />
                          <input
                            ref={urlInputRef}
                            id="url"
                            type="text"
                            defaultValue={initialUrl.current}
                            placeholder={urlPlaceholder}
                            className={`min-h-11 w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-orange-400/50 focus-visible:ring-2 focus-visible:ring-orange-400/25 ${fieldInputClassName}`}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {requiresCredentials ? (
                        <>
                          <div className="space-y-2">
                            <label
                              htmlFor="openhab-username"
                              className={`block text-sm font-medium ${textColor}`}
                            >
                              openHAB {t('login.username')}
                            </label>
                            <input
                              id="openhab-username"
                              type="text"
                              value={openhabUsername}
                              onChange={(event) => setOpenhabUsername(event.target.value)}
                              autoComplete="username"
                              placeholder={t('login.username')}
                              className={`min-h-11 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-orange-400/50 focus-visible:ring-2 focus-visible:ring-orange-400/25 ${fieldInputClassName}`}
                              disabled={isLoading}
                            />
                          </div>

                          <div className="space-y-2">
                            <label
                              htmlFor="openhab-password"
                              className={`block text-sm font-medium ${textColor}`}
                            >
                              openHAB {t('login.password')}
                            </label>
                            <input
                              id="openhab-password"
                              type="password"
                              value={openhabPassword}
                              onChange={(event) => setOpenhabPassword(event.target.value)}
                              autoComplete="current-password"
                              placeholder={t('login.password')}
                              className={`min-h-11 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-orange-400/50 focus-visible:ring-2 focus-visible:ring-orange-400/25 ${fieldInputClassName}`}
                              disabled={isLoading}
                            />
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  <div className="space-y-2">
                    <div className="h-px bg-white/8" />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-orange-300/20 bg-[linear-gradient(180deg,#fb923c,#f97316)] px-4 py-3 text-white shadow-[0_18px_42px_-24px_rgba(249,115,22,0.88)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {t('login.connecting')}
                        </span>
                      ) : (
                        t('login.actions.continue')
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProviderId(null);
                        setError('');
                      }}
                      className="min-h-11 w-full rounded-full border border-white/12 bg-white/6 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      {t('login.actions.back')}
                    </button>
                  </div>

                  <p className={`text-center text-xs leading-5 ${mutedColor}`}>
                    {!requiresUrl
                      ? t('login.hint.cloudOauth', {
                          provider: provider.label,
                          signInProvider: providerSignInLabel ?? provider.label,
                        })
                      : provider.id === 'openhab'
                        ? 'Navet will connect directly to your openHAB server with the URL and credentials you provide.'
                        : provider.loginMode === 'url_session'
                          ? t('login.hint.urlSession', { provider: provider.label })
                          : !usesOAuthRedirect
                            ? t('login.connectProviderTitle', { provider: provider.label })
                            : isDiscovering
                              ? t('login.hint.discoverySearching')
                              : discoveredUrl
                                ? t('login.hint.discoveryFound')
                                : t('login.hint.oauthReturn', { provider: provider.label })}
                  </p>
                </div>
              ) : null}
            </div>
          </form>

          <div className="mx-auto mt-4 flex w-full max-w-md items-center justify-center gap-2 text-white/60">
            <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="relative min-w-[7rem]">
              <select
                value={language}
                onChange={(event) => {
                  const nextLanguage = languageOptions.find(
                    (option) => option.value === event.currentTarget.value
                  )?.value;

                  if (nextLanguage) {
                    updateSettings({ language: nextLanguage });
                  }
                }}
                aria-label={t('settings.localization.language.title')}
                className="h-8 w-full appearance-none rounded-full border border-transparent bg-transparent px-2.5 pr-7 text-sm text-white/72 outline-none backdrop-blur-sm focus-visible:border-orange-400/45 focus-visible:ring-2 focus-visible:ring-orange-400/25"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
