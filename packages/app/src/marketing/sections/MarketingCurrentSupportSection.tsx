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
  MarketingEyebrow,
  MarketingHeadline,
  MarketingPillGroup,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_CURRENT_SUPPORT } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';

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

function SupportEditorialColumn({
  kicker,
  title,
  items,
}: {
  kicker: string;
  title: string;
  items: readonly string[];
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <MarketingEyebrow className={surface.textMuted}>{kicker}</MarketingEyebrow>
        <Text
          className={cn(
            'max-w-[18ch] text-2xl font-semibold tracking-[-0.03em]',
            surface.textPrimary
          )}
        >
          {title}
        </Text>
      </div>
      <MarketingPillGroup items={items} />
    </div>
  );
}

export function MarketingCurrentSupportSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell variant="editorial" className={className}>
      <section className="relative px-1 py-2 md:px-0">
        <div className="pointer-events-none absolute bottom-0 left-[18%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.09),transparent_70%)] blur-3xl" />

        <div className="relative z-[1] space-y-10 md:space-y-12">
          <div className="grid gap-8 xl:grid-cols-2 xl:items-end">
            <div className="space-y-3">
              <MarketingHeadline className={cn('max-w-[12ch]', surface.textPrimary)}>
                {MARKETING_CURRENT_SUPPORT.title}
              </MarketingHeadline>
              <MarketingSupportText className={cn('max-w-[18ch]', surface.textSecondary)}>
                {MARKETING_CURRENT_SUPPORT.subtitle}
              </MarketingSupportText>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 xl:pl-1.5">
              {SUPPORTED_PROVIDER_LOGOS.map((provider, index) => (
                <div key={provider.name} className="space-y-4 pt-4">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl border p-3',
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
                  <div className="space-y-1">
                    <Text className={cn('text-lg font-semibold', surface.textPrimary)}>
                      {provider.name}
                    </Text>
                    <Text className={cn('text-sm leading-6', surface.textSecondary)}>
                      {MARKETING_CURRENT_SUPPORT.providers[index]?.status}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'grid gap-8 border-t pt-8 md:gap-10 md:pt-10 xl:grid-cols-2',
              surface.border
            )}
          >
            <SupportEditorialColumn
              kicker={`${MARKETING_CURRENT_SUPPORT.dashboardSections.length} dashboard sections`}
              title="Rooms for the routines people actually use."
              items={MARKETING_CURRENT_SUPPORT.dashboardSections}
            />
            <SupportEditorialColumn
              kicker={`${MARKETING_CURRENT_SUPPORT.cards.length} entity card types`}
              title="Coverage across the core smart-home controls."
              items={MARKETING_CURRENT_SUPPORT.cards}
            />
            <SupportEditorialColumn
              kicker={`${MARKETING_CURRENT_SUPPORT.widgets.length} custom widgets`}
              title="Utility surfaces for the details that don’t fit a basic card."
              items={MARKETING_CURRENT_SUPPORT.widgets}
            />
            <SupportEditorialColumn
              kicker={`${MARKETING_CURRENT_SUPPORT.providers.length} provider adapters`}
              title="A provider-neutral layer that is already proving out the model."
              items={MARKETING_CURRENT_SUPPORT.providers.map((provider) => provider.name)}
            />
          </div>
        </div>
      </section>
    </MarketingSectionShell>
  );
}
