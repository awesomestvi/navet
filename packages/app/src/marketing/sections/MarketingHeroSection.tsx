import heroBackgroundRoomAvif from '@assets/reference/marketing/use-cases/navet-hero-background-room.avif';
import heroBackgroundRoomPng from '@assets/reference/marketing/use-cases/navet-hero-background-room.png';
import heroBackgroundRoomWebp from '@assets/reference/marketing/use-cases/navet-hero-background-room.webp';
import heroDashboardOverlayAvif from '@assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.avif';
import heroDashboardOverlayPng from '@assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.png';
import heroDashboardOverlayWebp from '@assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.webp';
import { Button, Heading, Link, Text } from '@navet/app/components/primitives';
import { MarketingPillGroup } from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_HERO_CONTENT } from '@navet/app/marketing/data/marketingContent';
import { GithubMark } from '@navet/app/marketing/icons/GithubMark';
import { AnimatedGradientText } from '@website/components/effects/animated-gradient-text';
import { ArrowRight } from 'lucide-react';

export function MarketingHeroSection() {
  const [primaryDemoCta] = MARKETING_HERO_CONTENT.primaryCtas;

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
      <div className="relative min-h-screen">
        <MarketingResponsiveImage
          src={heroBackgroundRoomPng}
          sources={[
            { srcSet: heroBackgroundRoomAvif, type: 'image/avif' },
            { srcSet: heroBackgroundRoomWebp, type: 'image/webp' },
          ]}
          alt="Warm modern living space used as the background for the Navet marketing hero"
          pictureClassName="absolute inset-0"
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,13,0.88)_0%,rgba(6,8,13,0.58)_28%,rgba(6,8,13,0.18)_56%,rgba(6,8,13,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,13,0.26)_0%,rgba(6,8,13,0.12)_38%,rgba(6,8,13,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_72%_22%,rgba(245,158,11,0.1),transparent_22%),radial-gradient(circle_at_52%_110%,rgba(6,8,13,0.96),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(6,8,13,0)_0%,rgba(6,8,13,0.32)_24%,rgba(6,8,13,0.72)_58%,rgba(6,8,13,0.96)_100%)] sm:h-40 lg:h-48" />
        <div className="pointer-events-none absolute inset-x-[8%] bottom-[-4.5rem] h-28 rounded-[999px] bg-[#06080d] opacity-90 blur-3xl sm:bottom-[-5rem] sm:h-32 lg:bottom-[-5.5rem] lg:h-36" />

        <div className="relative mx-auto grid min-h-screen w-full max-w-[1320px] items-center gap-10 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 lg:px-8 lg:py-32">
          <div className="max-w-[640px] space-y-6">
            <div className="space-y-4">
              <Heading
                as="h1"
                className="max-w-[9ch] text-4xl leading-[0.96] tracking-[-0.05em] md:text-6xl"
              >
                {MARKETING_HERO_CONTENT.headline.lead}{' '}
                <AnimatedGradientText
                  className="text-inherit"
                  colorFrom="#ffb14f"
                  colorTo="#ffd18a"
                  speed={1.2}
                  style={{
                    animation:
                      'magic-gradient-shift var(--magic-gradient-duration, 2.8s) ease infinite',
                  }}
                >
                  {MARKETING_HERO_CONTENT.headline.accent}
                </AnimatedGradientText>
              </Heading>
              <Text className="max-w-2xl text-base leading-7 text-white/78 md:text-xl md:leading-8">
                {MARKETING_HERO_CONTENT.subheadline}
              </Text>
              <Text className="max-w-2xl text-sm leading-6 text-white/58 md:text-base">
                {MARKETING_HERO_CONTENT.supportLine}
              </Text>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="justify-center sm:justify-start"
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
            <MarketingPillGroup items={MARKETING_HERO_CONTENT.pills} />
            <div className="flex flex-wrap items-center gap-4">
              {MARKETING_HERO_CONTENT.secondaryCtas.map((cta, index) => (
                <Link
                  key={cta.label}
                  href={cta.href}
                  target={cta.external ? '_blank' : undefined}
                  rel={cta.external ? 'noreferrer' : undefined}
                  showExternalIcon={cta.external}
                  className="text-white"
                >
                  {index === 0 ? <GithubMark className="h-4 w-4" /> : null}
                  {cta.label}
                </Link>
              ))}
              <Text className="text-white/64">
                Wall panels, tablets, desktops, and phones stay familiar.
              </Text>
            </div>
          </div>
          <div className="relative hidden min-h-[360px] lg:flex lg:items-center lg:justify-end">
            <div className="pointer-events-none absolute right-[8%] top-[12%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.42),transparent_72%)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-[12%] right-[18%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)] blur-3xl" />
            <div className="relative w-full max-w-[980px] translate-x-[12%] -translate-y-[2rem] drop-shadow-[0_48px_120px_rgba(0,0,0,0.68)] xl:max-w-[1080px] xl:translate-x-[14%] xl:-translate-y-[2.5rem]">
              <MarketingResponsiveImage
                src={heroDashboardOverlayPng}
                sources={[
                  { srcSet: heroDashboardOverlayAvif, type: 'image/avif' },
                  { srcSet: heroDashboardOverlayWebp, type: 'image/webp' },
                ]}
                alt="Navet dashboard product preview shown on a tablet-style device"
                className="block h-auto w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
