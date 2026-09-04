import heroBackgroundRoomAvif from '@assets/reference/marketing/use-cases/navet-hero-background-room.avif';
import heroBackgroundRoomPng from '@assets/reference/marketing/use-cases/navet-hero-background-room.png';
import heroBackgroundRoomWebp from '@assets/reference/marketing/use-cases/navet-hero-background-room.webp';
import heroBackgroundRoomOff from '@assets/reference/marketing/use-cases/navet-hero-background-room-off.webp';
import heroDashboardTabletOff from '@assets/reference/marketing/use-cases/navet-hero-dashboard-light-off.webp';
import heroDashboardTablet from '@assets/reference/marketing/use-cases/navet-hero-dashboard-light-on.webp';
import { Button } from '@navet/app/components/primitives/button';
import { Heading } from '@navet/app/components/primitives/heading';
import { Link } from '@navet/app/components/primitives/link';
import { Text } from '@navet/app/components/primitives/text';
import { cn } from '@navet/app/components/ui/utils';
import { MarketingPillGroup } from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_HERO_CONTENT } from '@navet/app/marketing/data/marketingContent';
import { AnimatedGradientText } from '@website/components/effects/animated-gradient-text';
import { ArrowRight, ChevronDown, Hand } from 'lucide-react';
import { useId, useState } from 'react';

type MarketingHeroVisualProps = {
  mobile?: boolean;
  lightOn: boolean;
  onToggleLight: () => void;
};

function MarketingHeroVisual({ mobile = false, lightOn, onToggleLight }: MarketingHeroVisualProps) {
  const hintId = useId();
  return (
    <div
      className={cn(
        'marketing-hero-wall-scene relative',
        mobile
          ? 'mx-auto mb-10 w-full max-w-[35rem] lg:hidden'
          : 'hidden min-h-[360px] lg:flex lg:items-center lg:justify-end'
      )}
    >
      <div
        className={cn(
          'marketing-hero-visual-frame relative',
          mobile
            ? 'marketing-hero-visual-frame--mobile'
            : 'w-full max-w-[620px] translate-x-[5%] -translate-y-[2rem] xl:max-w-[690px] xl:translate-x-[8%]'
        )}
      >
        <fieldset className="marketing-hero-wall-panel" aria-label="Navet wall panel sample home">
          <div className="marketing-hero-panel-screen">
            <MarketingResponsiveImage
              src={heroDashboardTablet}
              alt="Navet's Home dashboard with its sidebar, room navigation, summary, and device cards"
              width={999}
              height={791}
              className="block h-auto w-full"
              loading="eager"
              fetchPriority="high"
            />
            {/* Swap the complete demo capture so the card and dashboard summary stay authentic. */}
            <img
              src={heroDashboardTabletOff}
              alt=""
              width={999}
              height={791}
              aria-hidden="true"
              className="marketing-hero-dashboard-off"
              style={{ opacity: lightOn ? 0 : 1 }}
              loading="eager"
              fetchPriority="low"
            />
            <Button
              variant="ghost"
              className="marketing-hero-light-hotspot"
              aria-label="Kitchen island light"
              aria-pressed={lightOn}
              aria-describedby={hintId}
              onClick={onToggleLight}
            >
              <span className="sr-only">Toggle kitchen island light</span>
            </Button>
            <span className="marketing-hero-touch-ring" aria-hidden="true" />
          </div>
          <div className="marketing-hero-sheen" aria-hidden="true" />
        </fieldset>
        <Text id={hintId} className="marketing-hero-panel-hint">
          <Hand className="h-3.5 w-3.5" aria-hidden="true" />
          Try the kitchen light
          <span className="sr-only"> in this sample home</span>
        </Text>
      </div>
    </div>
  );
}

export function MarketingHeroSection() {
  const [primaryDemoCta] = MARKETING_HERO_CONTENT.primaryCtas;
  const [lightOn, setLightOn] = useState(true);
  const toggleLight = () => setLightOn((on) => !on);

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
      <div
        className="marketing-hero-shell relative min-h-[46rem] sm:min-h-screen"
        data-room-light={lightOn ? 'on' : 'off'}
      >
        <MarketingResponsiveImage
          src={heroBackgroundRoomPng}
          sources={[
            { srcSet: heroBackgroundRoomAvif, type: 'image/avif' },
            { srcSet: heroBackgroundRoomWebp, type: 'image/webp' },
          ]}
          alt="Warm modern living space used as the background for the Navet marketing hero"
          pictureClassName="marketing-hero-background-shell absolute inset-0"
          className="marketing-hero-background-image absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="low"
          sizes="100vw"
        />
        <div className="marketing-hero-room-off" aria-hidden="true">
          <img
            src={heroBackgroundRoomOff}
            alt=""
            width={1672}
            height={941}
            className="marketing-hero-background-image absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            fetchPriority="low"
          />
        </div>
        <div className="marketing-hero-room-shade" aria-hidden="true" />

        <div className="marketing-hero-layout relative mx-auto grid min-h-[46rem] w-full max-w-[1320px] items-center gap-8 px-4 pt-28 pb-14 sm:px-6 sm:py-28 lg:min-h-screen lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 lg:px-8 lg:py-32">
          <div className="marketing-hero-copy max-w-[640px] space-y-5 sm:space-y-6">
            <div className="marketing-hero-copy-stack space-y-3 sm:space-y-4">
              <Heading
                as="h1"
                className="marketing-hero-title max-w-[10.25ch] text-[2.75rem] leading-[0.94] tracking-[-0.06em] sm:text-5xl md:text-6xl"
              >
                {MARKETING_HERO_CONTENT.headline.lead}{' '}
                <AnimatedGradientText
                  className="-mb-[0.12em] inline-block pb-[0.12em] pr-[0.04em] text-inherit"
                  colorFrom="#ffb14f"
                  colorTo="#ffd18a"
                  speed={1.2}
                >
                  {MARKETING_HERO_CONTENT.headline.accent}
                </AnimatedGradientText>
              </Heading>
              <Text className="marketing-hero-subheadline max-w-[30rem] text-[15px] leading-6 text-white/78 sm:text-base sm:leading-7 md:text-xl md:leading-8">
                {MARKETING_HERO_CONTENT.subheadline}
              </Text>
              <Text className="marketing-hero-support-line max-w-[26rem] text-sm leading-[1.35rem] text-white/58 sm:leading-6 md:text-base">
                {MARKETING_HERO_CONTENT.supportLine}
              </Text>
            </div>
            <div className="marketing-hero-actions flex flex-col gap-3 sm:flex-row">
              <Button
                className="w-full justify-center sm:w-auto sm:justify-start"
                onClick={() => {
                  window.location.assign(primaryDemoCta.href);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {primaryDemoCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Button>
            </div>
            <MarketingPillGroup
              items={MARKETING_HERO_CONTENT.pills}
              className="marketing-hero-pills"
              compactMobile
              mobileBehavior="scroll"
            />
            <MarketingHeroVisual mobile lightOn={lightOn} onToggleLight={toggleLight} />
            <div className="space-y-3 sm:space-y-4">
              <div className="marketing-hero-secondary-links flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
                {MARKETING_HERO_CONTENT.secondaryCtas.map((cta) => (
                  <Link
                    key={cta.label}
                    href={cta.href}
                    target={cta.external ? '_blank' : undefined}
                    rel={cta.external ? 'noreferrer' : undefined}
                    showExternalIcon={cta.external}
                    className="text-white"
                  >
                    {cta.label}
                  </Link>
                ))}
              </div>
              <Text className="text-sm text-white/64 sm:text-[15px]">
                Wall panels, tablets, desktops, and phones stay familiar.
              </Text>
            </div>
          </div>
          <MarketingHeroVisual lightOn={lightOn} onToggleLight={toggleLight} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[2] hidden justify-center sm:bottom-6 sm:flex lg:bottom-7">
          <div className="flex flex-col items-center gap-0.5 text-white/42">
            <span className="text-[10px] font-light uppercase tracking-[0.18em]">Scroll</span>
            <Button
              variant="ghost"
              size="compact"
              iconOnly
              label="Scroll down"
              tabIndex={-1}
              className="h-9 w-9 border-transparent bg-transparent text-white/42 opacity-90"
            >
              <ChevronDown
                className="h-4 w-4 animate-[bounce_1.8s_ease-in-out_infinite]"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
