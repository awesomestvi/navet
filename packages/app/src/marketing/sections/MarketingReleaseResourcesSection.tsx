import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogoAvif from '@navet/app/assets/providers/homey.avif';
import homeyLogo from '@navet/app/assets/providers/homey.png';
import homeyLogoWebp from '@navet/app/assets/providers/homey.webp';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { Link, Panel, Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { APP_VERSION } from '@navet/app/constants/app-version';
import { useTheme } from '@navet/app/hooks';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ArrowUpRight, BookOpen, Boxes, History, Lightbulb, type LucideIcon } from 'lucide-react';

const RELEASE_URL = `${MARKETING_URLS.github}/releases/tag/v${APP_VERSION}`;

const RELEASE_HIGHLIGHTS = [
  {
    type: 'New',
    description: 'A room-based Lights dashboard with brightness, power, and scene controls.',
    markerClassName: 'bg-emerald-400',
  },
  {
    type: 'Improved',
    description: 'Clearer, denser layouts across Energy, Media, Security, Tasks, and Settings.',
    markerClassName: 'bg-sky-400',
  },
  {
    type: 'Fixed',
    description: 'More reliable recovery when provider data, visibility, or availability changes.',
    markerClassName: 'bg-orange-400',
  },
] as const;

type GuideLink = {
  label: string;
  description: string;
  href: string;
  icon?: LucideIcon;
  logo?: {
    src: string;
    alt: string;
    sources?: ReadonlyArray<{ srcSet: string; type: 'image/avif' | 'image/webp' }>;
  };
};

const GUIDE_LINKS: readonly GuideLink[] = [
  {
    label: 'Home Assistant setup',
    description: 'Add Navet as a custom panel, add-on, or standalone dashboard.',
    href: MARKETING_URLS.install.homeAssistantGuide,
    logo: {
      src: homeAssistantLogo,
      alt: 'Home Assistant logo',
    },
  },
  {
    label: 'Homey setup',
    description: 'Connect Navet to Homey and bring devices into one calm view.',
    href: MARKETING_URLS.install.homey,
    logo: {
      src: homeyLogo,
      alt: 'Homey logo',
      sources: [
        { srcSet: homeyLogoAvif, type: 'image/avif' },
        { srcSet: homeyLogoWebp, type: 'image/webp' },
      ],
    },
  },
  {
    label: 'openHAB setup',
    description: 'Use the openHAB adapter and follow its current support status.',
    href: MARKETING_URLS.install.openhab,
    logo: {
      src: openhabLogo,
      alt: 'openHAB logo',
    },
  },
  {
    label: 'Dashboard user guide',
    description: 'Learn rooms, layouts, navigation, and daily dashboard controls.',
    href: MARKETING_URLS.userGuide,
    icon: BookOpen,
  },
  {
    label: 'Cards and widgets',
    description: 'Build useful views for smart lights, climate, media, and energy.',
    href: MARKETING_URLS.widgetGuide,
    icon: Lightbulb,
  },
  {
    label: 'Integrations',
    description: 'See supported platforms and how provider connections work.',
    href: MARKETING_URLS.integrations,
    icon: Boxes,
  },
];

export function MarketingReleaseResourcesSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell
      title="Set up Navet. Keep up with every release."
      description="Use Navet as a smart home dashboard for Home Assistant, Homey, or openHAB. Start with the guide for your platform, then shape rooms and controls for smart lights, climate, media, energy, and security."
      variant="editorial"
      compactMobile
      className={className}
    >
      <div className="grid gap-4 lg:grid-cols-[0.76fr_1.24fr]">
        <Panel
          as="article"
          className="flex h-full flex-col justify-between gap-8 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_42%)] p-5 sm:p-7"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-400">
              <History className="h-4 w-4" aria-hidden="true" />
              Latest release
            </div>
            <div className="space-y-2">
              <Text className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Navet v{APP_VERSION}
              </Text>
              <Text tone="muted" className="max-w-md leading-7">
                See what is new, improved, and fixed before updating your dashboard.
              </Text>
            </div>

            <div className={cn('border-t pt-5', surface.border)}>
              <Text
                className={cn(
                  'text-xs font-semibold uppercase tracking-[0.14em]',
                  surface.textMuted
                )}
              >
                Release highlights
              </Text>
              <ul className="mt-4 space-y-4">
                {RELEASE_HIGHLIGHTS.map((highlight) => (
                  <li key={highlight.type} className="grid grid-cols-[auto_1fr] gap-3">
                    <span
                      className={cn('mt-[0.45rem] h-2 w-2 rounded-full', highlight.markerClassName)}
                      aria-hidden="true"
                    />
                    <div className="space-y-0.5">
                      <Text className={cn('text-sm font-semibold', surface.textPrimary)}>
                        {highlight.type}
                      </Text>
                      <Text tone="muted" className="text-sm leading-5">
                        {highlight.description}
                      </Text>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Link href={MARKETING_URLS.changelog}>Read the changelog</Link>
            <Link href={RELEASE_URL} target="_blank" showExternalIcon>
              View v{APP_VERSION} on GitHub
            </Link>
          </div>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDE_LINKS.map((guide) => {
            const Icon = guide.icon;
            return (
              <a
                key={guide.label}
                href={guide.href}
                className={cn(
                  'group rounded-[1.35rem] border p-4 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-orange-400/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:p-5',
                  surface.border,
                  theme === 'light'
                    ? 'bg-white/65 hover:bg-white'
                    : 'bg-white/[0.035] hover:bg-white/[0.055]'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-orange-400">
                    {guide.logo ? (
                      <MarketingResponsiveImage
                        src={guide.logo.src}
                        sources={guide.logo.sources}
                        alt={guide.logo.alt}
                        className="h-5 w-5 object-contain"
                        width={20}
                        height={20}
                      />
                    ) : Icon ? (
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    ) : null}
                  </span>
                  <ArrowUpRight
                    className={cn(
                      'h-4 w-4 transition-colors group-hover:text-orange-500',
                      surface.textMuted
                    )}
                    aria-hidden="true"
                  />
                </div>
                <Text className={cn('mt-4 font-semibold', surface.textPrimary)}>{guide.label}</Text>
                <Text tone="muted" className="mt-1.5 text-sm leading-6">
                  {guide.description}
                </Text>
              </a>
            );
          })}
        </div>
      </div>

      <Text tone="muted" className="mt-5 text-sm">
        Looking for examples and community projects?{' '}
        <Link href={MARKETING_URLS.resources} size="small">
          Browse Navet resources
        </Link>
        .
      </Text>
    </MarketingSectionShell>
  );
}
