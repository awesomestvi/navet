import { AlertCircle, Home, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { FieldBlock } from '@/app/components/patterns';
import { Button, Input } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { getPublicAssetUrl } from '@/app/utils/public-assets';
import { useAuthSession } from '@/auth/AuthProvider';

export function LoginPage() {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthSession();
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const logoSrc = getPublicAssetUrl('logo.svg');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const hassUrl = urlInputRef.current?.value.trim() ?? '';
    if (!hassUrl) {
      setError('Home Assistant URL is required');
      return;
    }
    setIsLoading(true);
    try {
      await login({ hassUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const isLightTheme = theme === 'light';
  const textColor = isLightTheme ? 'text-slate-950' : 'text-white';
  const mutedColor = isLightTheme ? 'text-slate-600' : 'text-white/68';
  const loginPanelSurface = `${surface.border} ${surface.panelMuted} ${surface.cardShadow}`;

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-md p-6">
        <img src={logoSrc} alt="" className="mx-auto h-20 w-20" />
        <h1 className={`mt-6 text-center text-3xl ${textColor}`}>Connect to Home Assistant</h1>
        <p className={`mt-2 text-center text-sm ${mutedColor}`}>
          Enter your Home Assistant URL to continue with OAuth.
        </p>
        <form
          onSubmit={handleSubmit}
          className={`mt-8 rounded-3xl border p-5 ${loginPanelSurface}`}
        >
          <FieldBlock label={t('login.urlLabel')} htmlFor="url">
            <Input
              ref={urlInputRef}
              id="url"
              type="text"
              placeholder={t('login.urlPlaceholder')}
              leading={<Home className={`h-5 w-5 ${mutedColor}`} />}
              disabled={isLoading}
            />
          </FieldBlock>
          {error ? (
            <div className="mt-4 flex gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          ) : null}
          <Button variant="secondary" type="submit" disabled={isLoading} className="mt-5 w-full">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('login.connecting')}
              </span>
            ) : (
              'Continue'
            )}
          </Button>
          <p className={`${navetTypographyTokens.helper} mt-3 text-center ${mutedColor}`}>
            Legacy token login is no longer the default path.
          </p>
        </form>
      </section>
    </main>
  );
}
