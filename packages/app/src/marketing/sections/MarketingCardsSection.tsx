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
          <MarketingHeadline
            as={landing ? 'h1' : 'h2'}
            className={cn('max-w-[16ch]', surface.textPrimary)}
          >
            Introducing Navet Cards.
          </MarketingHeadline>
          <MarketingSupportText className={surface.textSecondary}>
            Navet Cards is a separate companion collection for your Home Assistant Lovelace
            dashboard. Add lights, rooms, heating, and music while keeping Home Assistant’s layout
            and navigation.
          </MarketingSupportText>
        </div>
        <div className="space-y-4">
          <p className={cn('max-w-lg text-base leading-7', surface.textSecondary)}>
            Use Navet Cards on its own with your Home Assistant login and devices. The Navet
            dashboard app is optional. Choose a card and configure it with the visual editor.
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
          alt="Individual Navet Cards for Home Assistant: lights, switches, room, temperature, speaker, climate, and cover"
          className="w-full"
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
