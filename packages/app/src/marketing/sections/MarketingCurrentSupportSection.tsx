import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogoAvif from '@navet/app/assets/providers/homey.avif';
import homeyLogo from '@navet/app/assets/providers/homey.png';
import homeyLogoWebp from '@navet/app/assets/providers/homey.webp';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  MarketingHeadline,
  MarketingPillGroup,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MarketingReveal } from '@navet/app/marketing/components/MarketingReveal';
import { MARKETING_CURRENT_SUPPORT } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ChevronDown } from 'lucide-react';

type SupportedProviderLogo = {
  name: string;
  src: string;
  alt: string;
  sources?: ReadonlyArray<{
    srcSet: string;
    type: 'image/avif' | 'image/webp';
  }>;
};

const SUPPORTED_PROVIDER_LOGOS: readonly SupportedProviderLogo[] = [
  {
    name: 'Home Assistant',
    src: homeAssistantLogo,
    alt: 'Home Assistant logo',
  },
  {
    name: 'Homey',
    src: homeyLogo,
    sources: [
      { srcSet: homeyLogoAvif, type: 'image/avif' },
      { srcSet: homeyLogoWebp, type: 'image/webp' },
    ],
    alt: 'Homey logo',
  },
  {
    name: 'openHAB',
    src: openhabLogo,
    alt: 'openHAB logo',
  },
];

function SupportEditorialColumn({ title, items }: { title: string; items: readonly string[] }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-2">
        <Text
          className={cn(
            'max-w-[18ch] text-[1.35rem] font-semibold tracking-[-0.03em] sm:text-2xl',
            surface.textPrimary
          )}
        >
          {title}
        </Text>
      </div>
      <MarketingPillGroup items={items} compactMobile mobileBehavior="wrap" />
    </div>
  );
}

export function MarketingCurrentSupportSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell variant="editorial" compactMobile className={className}>
      <MarketingReveal className="relative px-0.5 py-1 sm:px-1 sm:py-2 md:px-0">
        <div className="relative z-[1] space-y-7 sm:space-y-10 md:space-y-12">
          <div className="grid gap-6 sm:gap-8 xl:grid-cols-2 xl:items-end">
            <div className="space-y-2.5 sm:space-y-3">
              <MarketingHeadline compactMobile className={cn('max-w-[12ch]', surface.textPrimary)}>
                {MARKETING_CURRENT_SUPPORT.title}
              </MarketingHeadline>
              <MarketingSupportText
                compactMobile
                className={cn(
                  'max-w-[22ch] sm:max-w-[36ch] xl:max-w-[46ch]',
                  surface.textSecondary
                )}
              >
                {MARKETING_CURRENT_SUPPORT.subtitle}
              </MarketingSupportText>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:pl-1.5">
              {SUPPORTED_PROVIDER_LOGOS.map((provider, index) => (
                <div
                  key={provider.name}
                  className={cn(
                    'rounded-[24px] border p-4 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0',
                    surface.border,
                    theme === 'light'
                      ? 'bg-white/70 xl:bg-transparent'
                      : 'bg-white/[0.035] xl:bg-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border p-2.5 sm:h-14 sm:w-14 sm:p-3',
                      surface.border,
                      surface.iconBg
                    )}
                  >
                    <MarketingResponsiveImage
                      src={provider.src}
                      sources={provider.sources}
                      alt={provider.alt}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="mt-3 space-y-1">
                    <Text className={cn('text-base font-semibold sm:text-lg', surface.textPrimary)}>
                      {provider.name}
                    </Text>
                    <Text className={cn('text-sm leading-5 sm:leading-6', surface.textSecondary)}>
                      {MARKETING_CURRENT_SUPPORT.providers[index]?.status}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details className={cn('marketing-support-details group border-y py-5', surface.border)}>
            <summary
              className={cn(
                'flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-sm font-medium [&::-webkit-details-marker]:hidden',
                surface.textSecondary
              )}
            >
              Explore the cards, widgets, and dashboard sections
              <ChevronDown
                size={18}
                className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className={cn('mt-5 max-w-2xl text-sm leading-6', surface.textSecondary)}>
              Home Assistant supports the full feature set. Homey and openHAB currently cover rooms,
              lights, switches, and sensors.
            </p>
            <div className="grid gap-6 pt-6 sm:gap-8 xl:grid-cols-3">
              <SupportEditorialColumn
                title="Dashboard sections"
                items={MARKETING_CURRENT_SUPPORT.dashboardSections}
              />
              <SupportEditorialColumn title="Cards" items={MARKETING_CURRENT_SUPPORT.cards} />
              <SupportEditorialColumn title="Widgets" items={MARKETING_CURRENT_SUPPORT.widgets} />
            </div>
          </details>
        </div>
      </MarketingReveal>
    </MarketingSectionShell>
  );
}
