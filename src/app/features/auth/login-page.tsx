import { AlertCircle, Home, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FieldBlock } from '@/app/components/patterns';
import { Button, Input } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { getRuntimeConfig } from '@/app/config/runtime-config';
import { useI18n, useTheme } from '@/app/hooks';
import { getPublicAssetUrl } from '@/app/utils/public-assets';
import { useAuthSession } from '@/auth/AuthProvider';
import {
  chooseDiscoveredHomeAssistantUrl,
  fetchHomeAssistantDiscovery,
} from '@/auth/homeAssistantDiscovery';

export function LoginPage() {
  const initialUrl = useRef(getRuntimeConfig().hassUrl ?? '');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(!initialUrl.current);
  const [discoveredUrl, setDiscoveredUrl] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<'home_assistant' | 'homey'>('home_assistant');
  const { login } = useAuthSession();
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const logoSrc = getPublicAssetUrl('logo.svg');

  useEffect(() => {
    if (providerId !== 'home_assistant') {
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
  }, [providerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);
    try {
      if (providerId === 'homey') {
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

        await login({ providerId, hassUrl });
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
  const pageBackground = isLightTheme
    ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.22)_0%,rgba(249,115,22,0.10)_24%,transparent_46%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]'
    : isBlack
      ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.13)_24%,transparent_46%),linear-gradient(180deg,#050505_0%,#000_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.12)_24%,transparent_46%),linear-gradient(180deg,#060a12_0%,#030712_100%)]';

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

          <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.24em] ${mutedColor}`}>
            Navet
          </p>
          <h1
            className={`mx-auto mt-2 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl ${textColor}`}
          >
            {providerId === 'homey' ? 'Connect to Homey' : 'Connect to Home Assistant'}
          </h1>
          <p className={`mx-auto mt-3 max-w-md text-sm leading-relaxed ${mutedColor}`}>
            {providerId === 'homey'
              ? 'Continue with Homey Cloud OAuth, then choose which Homey Navet should use.'
              : 'Enter your Home Assistant URL to continue with OAuth.'}
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
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setProviderId('home_assistant')}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    providerId === 'home_assistant'
                      ? 'bg-orange-500 text-white'
                      : `${textColor} ${surface.hoverBg}`
                  }`}
                >
                  Home Assistant
                </button>
                <button
                  type="button"
                  onClick={() => setProviderId('homey')}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    providerId === 'homey'
                      ? 'bg-orange-500 text-white'
                      : `${textColor} ${surface.hoverBg}`
                  }`}
                >
                  Homey
                </button>
              </div>
              {providerId === 'home_assistant' ? (
                <FieldBlock
                  label={t('login.urlLabel')}
                  htmlFor="url"
                  hint={t('login.urlHelp')}
                  hintClassName={mutedColor}
                >
                  <Input
                    ref={urlInputRef}
                    id="url"
                    type="text"
                    defaultValue={initialUrl.current}
                    placeholder={t('login.urlPlaceholder')}
                    leading={<Home className={`h-5 w-5 ${mutedColor}`} />}
                    inputClassName={fieldInputClassName}
                    disabled={isLoading}
                  />
                </FieldBlock>
              ) : null}

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-400/22 bg-red-500/12 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
                  <p className="text-sm leading-6 text-red-100">{error}</p>
                </div>
              ) : null}

              <Button
                variant="secondary"
                type="submit"
                disabled={isLoading}
                className="min-h-12 w-full rounded-full border-orange-300/20 bg-[linear-gradient(180deg,#fb923c,#f97316)] px-4 py-3 text-white shadow-[0_18px_42px_-24px_rgba(249,115,22,0.88)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {providerId === 'homey' ? 'Connecting to Homey...' : t('login.connecting')}
                  </span>
                ) : (
                  'Continue'
                )}
              </Button>

              <p className={`${navetTypographyTokens.helper} text-center ${mutedColor}`}>
                {providerId === 'homey'
                  ? 'You’ll sign in with Athom, return to Navet, and pick a Homey if your account has more than one.'
                  : isDiscovering
                    ? 'Looking for Home Assistant...'
                    : discoveredUrl
                      ? 'Found Home Assistant on your network. You can edit the URL before continuing.'
                      : 'You’ll sign in on Home Assistant, then return to Navet.'}
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
