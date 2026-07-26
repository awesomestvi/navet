import { AuthProvider, useAuthSession } from '@navet/app/auth/AuthProvider';
import { lazy, Suspense, useCallback } from 'react';
import { LoginPage } from './features/auth/login-page';
import { I18nProvider, useI18n } from './i18n';

const AuthenticatedApp = lazy(() => import('./authenticated-app'));

function AppLoading({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 animate-spin text-orange-400"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
        <p className="text-sm text-white/70">{message}</p>
        {action}
      </div>
    </div>
  );
}

function AppGate() {
  const { ready, runtime, session } = useAuthSession();
  const { t } = useI18n();

  const cancelStandaloneStartup = useCallback(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('navet_oauth_callback');
    nextUrl.searchParams.delete('auth_callback');
    nextUrl.searchParams.delete('code');
    nextUrl.searchParams.delete('state');
    window.location.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, []);

  if (!ready) {
    return (
      <AppLoading
        message="Starting your dashboard..."
        action={
          runtime === 'standalone-oauth' ? (
            <button
              type="button"
              className="min-h-10 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white hover:bg-white/12"
              onClick={cancelStandaloneStartup}
            >
              {t('errorDisplay.backToLogin')}
            </button>
          ) : undefined
        }
      />
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Suspense fallback={<AppLoading message={t('common.loading')} />}>
      <AuthenticatedApp />
    </Suspense>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </I18nProvider>
  );
}
