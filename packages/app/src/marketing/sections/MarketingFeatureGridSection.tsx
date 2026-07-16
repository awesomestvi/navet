import navetLogo from '@assets/public/logo.svg';
import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogoAvif from '@navet/app/assets/providers/homey.avif';
import homeyLogo from '@navet/app/assets/providers/homey.png';
import homeyLogoWebp from '@navet/app/assets/providers/homey.webp';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { Link, Panel, Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

const PROVIDERS = [
  {
    name: 'Home Assistant',
    src: homeAssistantLogo,
    alt: 'Home Assistant logo',
  },
  {
    name: 'Homey',
    src: homeyLogo,
    alt: 'Homey logo',
    sources: [
      { srcSet: homeyLogoAvif, type: 'image/avif' as const },
      { srcSet: homeyLogoWebp, type: 'image/webp' as const },
    ],
  },
  {
    name: 'openHAB',
    src: openhabLogo,
    alt: 'openHAB logo',
  },
] as const;

const DASHBOARD_OUTCOMES = [
  'Find daily controls by room and purpose.',
  'Use familiar interactions for lights, climate, media, and security.',
  'Move between a wall panel, tablet, desktop, and phone without relearning the layout.',
] as const;

export function MarketingFeatureGridSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell
      title="Your platform runs the home. Navet makes it easier to use."
      description="Keep Home Assistant, Homey, or openHAB as the system behind your devices. Navet turns that setup into a focused daily dashboard for the people and screens in your home."
      variant="editorial"
      compactMobile
      className={className}
    >
      <Panel className="relative overflow-hidden p-5 sm:p-8 lg:p-10">
        <div className="relative grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] lg:gap-7">
          <div
            className={cn(
              'rounded-[1.5rem] border p-5 sm:p-6',
              surface.border,
              theme === 'light' ? 'bg-white/70' : 'bg-black/16'
            )}
          >
            <Text
              className={cn('text-xs font-semibold uppercase tracking-[0.16em]', surface.textMuted)}
            >
              Your existing setup
            </Text>
            <Text
              className={cn('mt-3 text-xl font-semibold tracking-[-0.025em]', surface.textPrimary)}
            >
              Keep the platform you already trust.
            </Text>
            <Text tone="muted" className="mt-2 text-sm leading-6">
              Navet connects to your current smart-home system instead of asking you to rebuild it.
            </Text>

            <div className="mt-6 space-y-2.5">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.name}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-3.5 py-3',
                    surface.border,
                    theme === 'light' ? 'bg-slate-50/85' : 'bg-white/[0.035]'
                  )}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-400/10">
                    <MarketingResponsiveImage
                      src={provider.src}
                      sources={'sources' in provider ? provider.sources : undefined}
                      alt={provider.alt}
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                  </span>
                  <Text className={cn('font-semibold', surface.textPrimary)}>{provider.name}</Text>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 py-1 lg:flex-row lg:gap-2 lg:py-0">
            <ArrowDown className="h-5 w-5 text-orange-400 lg:hidden" aria-hidden="true" />
            <ArrowRight
              className="hidden h-5 w-5 shrink-0 text-orange-400 lg:block"
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-center">
              <div className="absolute h-24 w-24 rounded-full bg-orange-500/15 blur-2xl" />
              <img
                src={navetLogo}
                alt="Navet"
                width={72}
                height={72}
                className="relative h-16 w-16 drop-shadow-[0_16px_32px_rgba(249,115,22,0.24)] sm:h-[4.5rem] sm:w-[4.5rem]"
              />
            </div>
            <ArrowDown className="h-5 w-5 text-orange-400 lg:hidden" aria-hidden="true" />
            <ArrowRight
              className="hidden h-5 w-5 shrink-0 text-orange-400 lg:block"
              aria-hidden="true"
            />
          </div>

          <div
            className={cn(
              'rounded-[1.5rem] border p-5 sm:p-6',
              surface.border,
              theme === 'light'
                ? 'bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(255,247,237,0.82))]'
                : 'bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.13),transparent_42%),rgba(255,255,255,0.035)]'
            )}
          >
            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-400">
              Your Navet dashboard
            </Text>
            <Text
              className={cn('mt-3 text-xl font-semibold tracking-[-0.025em]', surface.textPrimary)}
            >
              Give everyday control a simpler home.
            </Text>
            <Text tone="muted" className="mt-2 text-sm leading-6">
              Provider details stay in the background while the controls people use remain close at
              hand.
            </Text>

            <ul className="mt-6 space-y-4">
              {DASHBOARD_OUTCOMES.map((outcome) => (
                <li key={outcome} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-400">
                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <Text className={cn('text-sm leading-6', surface.textSecondary)}>{outcome}</Text>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={cn(
            'mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between',
            surface.border
          )}
        >
          <Text tone="muted" className="text-sm">
            Explore a sample home before connecting your own devices.
          </Text>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Link href={MARKETING_URLS.demo} target="_blank" showExternalIcon>
              Open the live demo
            </Link>
            <Link href={MARKETING_URLS.install.page} target="_blank" showExternalIcon>
              Choose an installation
            </Link>
          </div>
        </div>
      </Panel>
    </MarketingSectionShell>
  );
}
