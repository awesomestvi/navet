import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks/use-theme';
import { MarketingActionLink } from '@navet/app/marketing/components/MarketingActionLink';
import {
  MarketingHeadline,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import {
  getMarketingWebsitePath,
  MARKETING_URLS,
} from '@navet/app/marketing/constants/marketingLinks';

export function MarketingCardsSection({
  className,
  landing = false,
}: {
  className?: string;
  landing?: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const imageBase = import.meta.env.BASE_URL;

  return (
    <section className={cn('space-y-8', className)} aria-label="Navet Cards">
      <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <p className={cn('text-sm font-medium', surface.textSecondary)}>
            Navet Cards · Home Assistant · Beta
          </p>
          <MarketingHeadline
            as={landing ? 'h1' : 'h2'}
            className={cn('max-w-[16ch]', surface.textPrimary)}
          >
            Your Home Assistant dashboard. Navet controls.
          </MarketingHeadline>
          <MarketingSupportText className={surface.textSecondary}>
            Bring lights, rooms, heating, and music into the dashboard you already use. Navet Cards
            runs independently inside Home Assistant, using your existing login and devices.
          </MarketingSupportText>
        </div>
        <div className="space-y-4">
          <p className={cn('max-w-lg text-base leading-7', surface.textSecondary)}>
            Choose a card, select your entities, and make it yours with the visual editor. Home
            Assistant owns the layout; each card shows the controls your device supports.
          </p>
          <div className="flex flex-wrap gap-3">
            <MarketingActionLink
              href={landing ? MARKETING_URLS.cardsInstall : getMarketingWebsitePath('/cards/')}
            >
              {landing ? 'Install your first card' : 'Explore Navet Cards'}
            </MarketingActionLink>
            <MarketingActionLink variant="secondary" href={MARKETING_URLS.cardsDocs}>
              Cards documentation
            </MarketingActionLink>
          </div>
        </div>
      </div>
      <figure className="space-y-3">
        <img
          src={`${imageBase}cards-preview/composition.webp`}
          width={1126}
          height={556}
          alt="Navet Cards room dashboard with lighting, climate, sensors, and media controls"
          className="w-full rounded-3xl"
          loading={landing ? 'eager' : 'lazy'}
        />
        <figcaption className={cn('text-sm', surface.textSecondary)}>
          Preview with simulated devices. Navet Cards is an early beta for Home Assistant 2024.6.4
          or newer.
        </figcaption>
      </figure>
    </section>
  );
}
