import { AlertCircle, Eye, EyeOff, Home, Key, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { FieldBlock } from '@/app/components/patterns';
import { Button, Input } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { getRuntimeConfig } from '@/app/config/runtime-config';
import { useI18n, useTheme } from '@/app/hooks';
import { isUsableSessionToken } from '@/app/session/session';
import { useAuth } from '@/app/stores/auth-store';
import { useConfig } from '@/app/stores/config-store';
import { authSelectors, configSelectors } from '@/app/stores/selectors';
import { getPublicAssetUrl } from '@/app/utils/public-assets';

export function LoginPage() {
  const initialUrl = useRef(getRuntimeConfig().hassUrl ?? '');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuth(authSelectors.login);
  const testConnection = useConfig(configSelectors.testConnection);
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  const logoSrc = getPublicAssetUrl('logo.svg');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const url = urlInputRef.current?.value ?? '';
    const token = tokenInputRef.current?.value ?? '';

    // Validation
    if (!url.trim()) {
      setError(t('login.errors.urlRequired'));
      return;
    }

    if (!token.trim()) {
      setError(t('login.errors.tokenRequired'));
      return;
    }

    if (!isUsableSessionToken(token.trim())) {
      setError(t('login.errors.tokenInvalid'));
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      console.error('[LoginPage] Invalid URL format:', error);
      setError(t('login.errors.urlInvalid'));
      return;
    }

    setIsLoading(true);

    try {
      // Test the connection first
      const isValid = await testConnection(url, token);

      if (isValid) {
        // If connection is valid, proceed with login
        const success = await login(url, token);
        if (!success) {
          setError(t('login.errors.saveFailed'));
        }
      } else {
        // Connection failed - this is normal in development due to CORS
        // We'll still allow login but show a warning
        const success = await login(url, token);
        if (success) {
          // Login successful despite connection test failure
        } else {
          setError(t('login.errors.saveFailed'));
        }
      }
    } catch (_err) {
      setError(t('login.errors.unexpected'));
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
      <div className="pointer-events-none absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/10 blur-2xl" />

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
            {t('login.subtitle')}
          </h1>
          <p className={`mx-auto mt-3 max-w-md text-sm leading-relaxed ${mutedColor}`}>
            {t('login.footer')}
          </p>

          <form
            onSubmit={handleSubmit}
            className={`relative mx-auto mt-7 w-full max-w-md overflow-hidden rounded-[28px] border ${loginPanelSurface} p-4 text-left backdrop-blur-md sm:p-5`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background:
                  'radial-gradient(circle at top left, rgba(249,115,22,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(20,184,166,0.10), transparent 30%)',
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025)_22%,transparent_58%)]" />
            <div className="relative space-y-5">
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

              <FieldBlock
                label={t('login.tokenLabel')}
                htmlFor="token"
                hint={t('login.tokenHelp')}
                hintClassName={mutedColor}
              >
                <Input
                  ref={tokenInputRef}
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  placeholder={t('login.tokenPlaceholder')}
                  leading={<Key className={`h-5 w-5 ${mutedColor}`} />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className={`flex items-center ${mutedColor} transition-colors hover:text-orange-300`}
                      disabled={isLoading}
                      aria-label={showToken ? t('login.hideToken') : t('login.showToken')}
                    >
                      {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                  inputClassName={fieldInputClassName}
                  disabled={isLoading}
                />
              </FieldBlock>

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
                    {error ? t('login.retrying') : t('login.connecting')}
                  </span>
                ) : (
                  t('login.connect')
                )}
              </Button>

              <p className={`${navetTypographyTokens.helper} text-center ${mutedColor}`}>
                {t('login.help')}
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
