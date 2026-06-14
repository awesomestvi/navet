import { useAuthSession } from '@navet/app/auth/AuthProvider';
import { selectHomey } from '@navet/app/auth/adapters/homeyOAuthAuth';
import { isHomeyAuthSession } from '@navet/app/auth/types';
import { Button } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import { AlertCircle, ArrowRight, Home, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function HomeySelectionPage() {
  const { session, replaceSession, logout } = useAuthSession();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const logoSrc = getPublicAssetUrl('logo.svg');

  if (!session || !isHomeyAuthSession(session)) {
    return null;
  }

  const homeys = session.availableHomeys ?? [];
  const isLightTheme = theme === 'light';
  const isBlack = theme === 'black';
  const textColor = isLightTheme ? 'text-slate-950' : 'text-white';
  const mutedColor = isLightTheme ? 'text-slate-600' : 'text-white/68';
  const pageBackground = isLightTheme
    ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.22)_0%,rgba(249,115,22,0.10)_24%,transparent_46%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]'
    : isBlack
      ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.13)_24%,transparent_46%),linear-gradient(180deg,#050505_0%,#000_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.12)_24%,transparent_46%),linear-gradient(180deg,#060a12_0%,#030712_100%)]';
  const shellSurface = `${surface.border} ${surface.panelMuted} ${surface.cardShadow}`;
  const homeyOptionClassName = isLightTheme
    ? 'border-slate-300/80 bg-white/80 text-slate-950 hover:border-orange-200/80 hover:bg-orange-50/70 hover:shadow-[0_20px_40px_-34px_rgba(249,115,22,0.45)]'
    : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] text-white hover:border-orange-400/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.05))] hover:shadow-[0_22px_42px_-34px_rgba(249,115,22,0.42)]';

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
            Choose a Homey
          </h1>
          <p className={`mx-auto mt-3 max-w-md text-sm leading-relaxed ${mutedColor}`}>
            Navet found multiple Homeys in your Athom account. Pick the one this dashboard should
            use.
          </p>

          <div
            className={`relative mx-auto mt-7 w-full max-w-md overflow-hidden rounded-[28px] border p-4 text-left backdrop-blur-md sm:p-5 ${shellSurface}`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.10),transparent_30%)] opacity-90"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025)_22%,transparent_58%)]" />

            <div className="relative space-y-3">
              {homeys.map((homey) => {
                const location =
                  homey.localUrlSecure ?? homey.localUrl ?? homey.remoteUrl ?? homey.platform;
                const isSubmitting = submittingId === homey.id;

                return (
                  <button
                    key={homey.id}
                    type="button"
                    onClick={() => void handleSelect(homey.id)}
                    disabled={submittingId !== null}
                    className={cn(
                      'group flex w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-70',
                      homeyOptionClassName
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
                        isLightTheme
                          ? 'border-orange-200/80 bg-orange-50 text-orange-600'
                          : 'border-white/12 bg-black/15 text-orange-300'
                      )}
                    >
                      <Home className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-base font-medium', textColor)}>
                        {homey.name}
                      </span>
                      <span className={cn('mt-1 flex items-center gap-2 text-sm', mutedColor)}>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em]',
                            isLightTheme
                              ? 'bg-slate-950/6 text-slate-700'
                              : 'bg-white/8 text-white/72'
                          )}
                        >
                          {homey.platform ?? 'Homey'}
                        </span>
                        {location ? <span className="truncate">{location}</span> : null}
                      </span>
                    </span>

                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-orange-400" />
                    ) : (
                      <ArrowRight
                        className={cn(
                          'h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5',
                          isLightTheme ? 'text-slate-400' : 'text-white/42'
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {error ? (
              <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-red-400/22 bg-red-500/12 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
                <p className="text-sm leading-6 text-red-100">{error}</p>
              </div>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              onClick={() => void logout()}
              className="relative mt-4 w-full rounded-full"
            >
              Sign out
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
