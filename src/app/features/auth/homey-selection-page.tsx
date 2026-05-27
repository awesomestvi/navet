import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { useAuthSession } from '@/auth/AuthProvider';
import { selectHomey } from '@/auth/adapters/homeyOAuthAuth';
import { isHomeyAuthSession } from '@/auth/types';

export function HomeySelectionPage() {
  const { session, replaceSession, logout } = useAuthSession();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  if (!session || !isHomeyAuthSession(session)) {
    return null;
  }

  const homeys = session.availableHomeys ?? [];

  const handleSelect = async (homeyId: string) => {
    setSubmittingId(homeyId);
    setError('');

    try {
      const nextSession = await selectHomey(homeyId);
      replaceSession(nextSession);
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Unable to select Homey');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <main className="relative min-h-screen bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.22)_0%,rgba(249,115,22,0.10)_24%,transparent_46%),linear-gradient(180deg,#060a12_0%,#030712_100%)]">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-6">
        <div
          className={`w-full max-w-xl rounded-[28px] border p-5 backdrop-blur-md ${surface.border} ${surface.panelMuted} ${surface.cardShadow}`}
        >
          <h1 className="text-3xl font-semibold tracking-tight text-white">Choose a Homey</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/68">
            Navet found multiple Homeys in your Athom account. Pick the one this dashboard should
            use.
          </p>

          <div className="mt-6 space-y-3">
            {homeys.map((homey) => (
              <button
                key={homey.id}
                type="button"
                onClick={() => void handleSelect(homey.id)}
                disabled={submittingId !== null}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${surface.border} ${surface.hoverBg}`}
              >
                <span>
                  <span className="block text-base font-medium text-white">{homey.name}</span>
                  <span className="block text-sm text-white/60">
                    {homey.platform ?? 'Homey'}
                    {homey.localUrlSecure || homey.localUrl || homey.remoteUrl
                      ? ` • ${homey.localUrlSecure ?? homey.localUrl ?? homey.remoteUrl}`
                      : ''}
                  </span>
                </span>
                {submittingId === homey.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : null}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-400/22 bg-red-500/12 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
              <p className="text-sm leading-6 text-red-100">{error}</p>
            </div>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            onClick={() => void logout()}
            className="mt-5 w-full rounded-full"
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
