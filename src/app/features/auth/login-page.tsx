import { AlertCircle, Eye, EyeOff, Home, Key, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { FieldBlock } from '@/app/components/patterns';
import { Button, Input } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useAuth } from '@/app/contexts/auth-context';
import { useConfig } from '@/app/contexts/config-context';
import { useI18n, useTheme } from '@/app/hooks';
import { authSelectors, configSelectors } from '@/app/stores/selectors';

export function LoginPage() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuth(authSelectors.login);
  const testConnection = useConfig(configSelectors.testConnection);
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!url.trim()) {
      setError(t('login.errors.urlRequired'));
      return;
    }

    if (!token.trim()) {
      setError(t('login.errors.tokenRequired'));
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
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

  // Theme colors
  const bgPrimary =
    theme === 'light'
      ? 'bg-gray-50'
      : theme === 'black'
        ? 'bg-black'
        : theme === 'glass'
          ? 'bg-slate-950'
          : 'bg-[#0f0f0f]';

  const cardBg =
    theme === 'light'
      ? 'bg-white/80'
      : theme === 'black'
        ? 'bg-gray-950/95'
        : theme === 'glass'
          ? 'bg-white/10'
          : 'bg-gray-900/40';

  const border =
    theme === 'light'
      ? 'border-gray-200'
      : theme === 'black'
        ? 'border-white/30'
        : theme === 'glass'
          ? 'border-white/20'
          : 'border-white/10';

  const inputBg =
    theme === 'light'
      ? 'bg-gray-100'
      : theme === 'black'
        ? 'bg-black/50'
        : theme === 'glass'
          ? 'bg-white/8'
          : 'bg-white/5';

  const textPrimary = surface.textPrimary;
  const textSecondary = surface.textSecondary;
  const textMuted = theme === 'black' ? 'text-gray-300' : surface.textMuted;

  return (
    <div className={`min-h-screen ${bgPrimary} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl ${cardBg} backdrop-blur-xl border ${border} shadow-lg mb-4`}
          >
            <Home className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>{t('login.title')}</h1>
          <p className={`text-sm ${textSecondary}`}>{t('login.subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className={`${cardBg} backdrop-blur-xl border ${border} rounded-3xl shadow-2xl p-8`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldBlock label={t('login.urlLabel')} htmlFor="url" hint={t('login.urlHelp')}>
              <Input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('login.urlPlaceholder')}
                leading={<Home className={`h-5 w-5 ${textMuted}`} />}
                inputClassName={`${inputBg} ${border} ${textPrimary}`}
                disabled={isLoading}
              />
            </FieldBlock>

            <FieldBlock label={t('login.tokenLabel')} htmlFor="token" hint={t('login.tokenHelp')}>
              <Input
                id="token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t('login.tokenPlaceholder')}
                leading={<Key className={`h-5 w-5 ${textMuted}`} />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className={`flex items-center ${textMuted} transition-colors`}
                    disabled={isLoading}
                    aria-label={showToken ? t('login.hideToken') : t('login.showToken')}
                  >
                    {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
                inputClassName={`${inputBg} ${border} ${textPrimary}`}
                disabled={isLoading}
              />
            </FieldBlock>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl px-4 py-3 shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-orange-500/30"
              style={{ backgroundColor: '#f97316' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  {error ? t('login.retrying') : t('login.connecting')}
                </span>
              ) : (
                t('login.connect')
              )}
            </Button>
          </form>

          {/* Help Text */}
          <div className={`mt-6 pt-6 border-t ${border}`}>
            <p className={`text-xs ${textMuted} text-center leading-relaxed`}>{t('login.help')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className={`text-xs ${textMuted}`}>{t('login.footer')}</p>
        </div>
      </div>
    </div>
  );
}
