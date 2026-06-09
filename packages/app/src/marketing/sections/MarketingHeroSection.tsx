import { Button, Heading, Link, Text } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { MarketingPillGroup } from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_HERO_CONTENT } from '@navet/app/marketing/data/marketingContent';
import { GithubMark } from '@navet/app/marketing/icons/GithubMark';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { AnimatedGradientText } from '../../../../../apps/website/src/components/effects/animated-gradient-text';
import heroBackgroundRoomAvif from '../../../../../assets/reference/marketing/use-cases/navet-hero-background-room.avif';
import heroBackgroundRoomPng from '../../../../../assets/reference/marketing/use-cases/navet-hero-background-room.png';
import heroBackgroundRoomWebp from '../../../../../assets/reference/marketing/use-cases/navet-hero-background-room.webp';
import heroDashboardOverlayAvif from '../../../../../assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.avif';
import heroDashboardOverlayPng from '../../../../../assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.png';
import heroDashboardOverlayWebp from '../../../../../assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.webp';

function MarketingHeroVisual({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={cn(
        'relative',
        mobile
          ? 'mx-auto mb-10 w-full max-w-[27rem] px-1 lg:hidden'
          : 'hidden min-h-[360px] lg:flex lg:items-center lg:justify-end'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute rounded-full blur-3xl',
          mobile
            ? 'left-[8%] top-[8%] h-24 w-24 bg-[radial-gradient(circle,rgba(249,115,22,0.42),transparent_72%)]'
            : 'right-[8%] top-[12%] h-32 w-32 bg-[radial-gradient(circle,rgba(249,115,22,0.42),transparent_72%)]'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute rounded-full blur-3xl',
          mobile
            ? 'bottom-[8%] right-[12%] h-28 w-28 bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)]'
            : 'bottom-[12%] right-[18%] h-40 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)]'
        )}
      />
      <div
        className={cn(
          'marketing-hero-visual-frame relative drop-shadow-[0_48px_120px_rgba(0,0,0,0.68)]',
          mobile
            ? 'shadow-[0_26px_68px_-38px_rgba(0,0,0,0.9)]'
            : 'w-full max-w-[980px] translate-x-[12%] -translate-y-[2rem] xl:max-w-[1080px] xl:translate-x-[14%] xl:-translate-y-[2.5rem]'
        )}
      >
        <MarketingResponsiveImage
          src={heroDashboardOverlayPng}
          sources={[
            { srcSet: heroDashboardOverlayAvif, type: 'image/avif' },
            { srcSet: heroDashboardOverlayWebp, type: 'image/webp' },
          ]}
          alt="Navet dashboard product preview shown on a tablet-style device"
          className={cn(
            'block h-auto w-full',
            mobile ? 'translate-y-1 scale-[1.12] origin-top' : undefined
          )}
          loading="eager"
          fetchPriority="high"
          sizes={
            mobile
              ? '(max-width: 639px) 92vw, (max-width: 1023px) 70vw, 980px'
              : '(max-width: 1023px) 70vw, 980px'
          }
        />
      </div>
    </div>
  );
}

export function MarketingHeroSection() {
  const [primaryDemoCta] = MARKETING_HERO_CONTENT.primaryCtas;

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
      <div className="marketing-hero-shell relative min-h-[46rem] sm:min-h-screen">
        <MarketingResponsiveImage
          src={heroBackgroundRoomPng}
          sources={[
            { srcSet: heroBackgroundRoomAvif, type: 'image/avif' },
            { srcSet: heroBackgroundRoomWebp, type: 'image/webp' },
          ]}
          alt="Warm modern living space used as the background for the Navet marketing hero"
          pictureClassName="marketing-hero-background-shell absolute inset-0"
          className="marketing-hero-background-image absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,13,0.9)_0%,rgba(6,8,13,0.68)_24%,rgba(6,8,13,0.34)_52%,rgba(6,8,13,0.14)_100%)] sm:bg-[linear-gradient(90deg,rgba(6,8,13,0.88)_0%,rgba(6,8,13,0.58)_28%,rgba(6,8,13,0.18)_56%,rgba(6,8,13,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,13,0.32)_0%,rgba(6,8,13,0.2)_34%,rgba(6,8,13,0.88)_100%)] sm:bg-[linear-gradient(180deg,rgba(6,8,13,0.26)_0%,rgba(6,8,13,0.12)_38%,rgba(6,8,13,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(249,115,22,0.22),transparent_24%),radial-gradient(circle_at_72%_22%,rgba(245,158,11,0.1),transparent_20%),radial-gradient(circle_at_52%_110%,rgba(6,8,13,0.96),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(6,8,13,0)_0%,rgba(6,8,13,0.38)_26%,rgba(6,8,13,0.76)_56%,rgba(6,8,13,0.96)_100%)] sm:h-40 lg:h-48" />
        <div className="pointer-events-none absolute inset-x-[10%] bottom-[-3.75rem] h-24 rounded-[999px] bg-[#06080d] opacity-90 blur-3xl sm:bottom-[-5rem] sm:h-32 lg:bottom-[-5.5rem] lg:h-36" />

        <div className="marketing-hero-layout relative mx-auto grid min-h-[46rem] w-full max-w-[1320px] items-center gap-8 px-4 pt-28 pb-14 sm:px-6 sm:py-28 lg:min-h-screen lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 lg:px-8 lg:py-32">
          <div className="marketing-hero-copy max-w-[640px] space-y-5 sm:space-y-6">
            <div className="marketing-hero-copy-stack space-y-3 sm:space-y-4">
              <Heading
                as="h1"
                className="marketing-hero-title max-w-[10.25ch] text-[2.75rem] leading-[0.94] tracking-[-0.06em] sm:text-5xl md:text-6xl"
              >
                {MARKETING_HERO_CONTENT.headline.lead}{' '}
                <AnimatedGradientText
                  className="inline-block pr-[0.04em] text-inherit"
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
              <Text className="max-w-[30rem] text-[15px] leading-6 text-white/78 sm:text-base sm:leading-7 md:text-xl md:leading-8">
                {MARKETING_HERO_CONTENT.subheadline}
              </Text>
              <Text className="max-w-[26rem] text-sm leading-[1.35rem] text-white/58 sm:leading-6 md:text-base">
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
            <MarketingHeroVisual mobile />
            <div className="space-y-3 sm:space-y-4">
              <div className="marketing-hero-secondary-links flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
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
              </div>
              <Text className="text-sm text-white/64 sm:text-[15px]">
                Wall panels, tablets, desktops, and phones stay familiar.
              </Text>
            </div>
          </div>
          <MarketingHeroVisual />
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
