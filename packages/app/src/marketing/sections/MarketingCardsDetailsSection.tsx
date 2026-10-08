import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks/use-theme';
import { MarketingActionLink } from '@navet/app/marketing/components/MarketingActionLink';
import {
  getMarketingWebsitePath,
  MARKETING_URLS,
} from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_CARDS_GUIDES } from '@navet/app/marketing/data/marketingCardsContent';

export function MarketingCardsDetailsSection() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <>
      <section className="space-y-6" aria-labelledby="cards-everyday">
        <h2
          id="cards-everyday"
          className={cn('text-3xl font-semibold tracking-tight', surface.textPrimary)}
        >
          Choose the controls you use most.
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <p className={cn('max-w-2xl text-lg leading-8', surface.textSecondary)}>
            Turn on a light, adjust the temperature, pause a speaker, or check who is home. Add a
            room card for grouped controls, then bring in weather, battery readings, notes, photos,
            and action buttons where they help.
          </p>
          <p className={cn('max-w-2xl leading-7', surface.textSecondary)}>
            Use the visual editor for everyday settings and YAML for advanced actions and
            conditions. Choose automatic, light, dark, black, or glass themes. Device controls
            follow the capabilities available in Home Assistant.
          </p>
        </div>
      </section>
      <section className="space-y-6" aria-labelledby="choose-navet">
        <h2 id="choose-navet" className="text-3xl font-semibold tracking-tight">
          Choose where your dashboard lives.
        </h2>
        <div className={cn('grid gap-8 border-y py-8 md:grid-cols-2', surface.border)}>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Navet</h3>
            <p className={cn('leading-7', surface.textSecondary)}>
              A complete dashboard for Home Assistant, Homey, and openHAB. Choose Navet for a
              dedicated household interface with its own rooms, navigation, widgets, and wall
              display settings.
            </p>
            <MarketingActionLink variant="secondary" href={getMarketingWebsitePath('/')}>
              Explore Navet
            </MarketingActionLink>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">
              Navet Cards <span className="text-sm font-normal">Beta</span>
            </h3>
            <p className={cn('leading-7', surface.textSecondary)}>
              Custom cards for an existing Home Assistant dashboard. Choose Cards to keep Home
              Assistant’s dashboard navigation and placement. Install the card resource in Home
              Assistant; the Navet app is optional.
            </p>
            <MarketingActionLink href={MARKETING_URLS.cardsInstall}>
              Set up Navet Cards
            </MarketingActionLink>
          </div>
        </div>
      </section>
      <section className="space-y-6" aria-labelledby="cards-guides">
        <h2 id="cards-guides" className="text-3xl font-semibold tracking-tight">
          Make the cards yours.
        </h2>
        <div className="grid gap-x-8 md:grid-cols-2">
          {MARKETING_CARDS_GUIDES.map(([title, description, path]) => (
            <a
              key={path}
              href={`${MARKETING_URLS.cardsDocs}${path}/`}
              className={cn(
                'rounded-sm border-b py-6 transition-colors hover:text-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400',
                surface.border
              )}
            >
              <h3 className="text-lg font-semibold">
                {title} <span aria-hidden="true">↗</span>
              </h3>
              <p className={cn('mt-2 text-sm leading-6', surface.textSecondary)}>{description}</p>
            </a>
          ))}
        </div>
        <p className={cn('text-sm leading-6', surface.textSecondary)}>
          Read the selected release notes before installing the beta.{' '}
          <a className="underline" href={MARKETING_URLS.cardsReleases}>
            Browse releases
          </a>
          {' · '}
          <a className="underline" href={MARKETING_URLS.cardsGithub}>
            Source and support on GitHub
          </a>
        </p>
      </section>
    </>
  );
}
