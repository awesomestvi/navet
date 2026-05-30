import { AnimatedGradientText } from '@website/components/magicui/animated-gradient-text';
import { ArrowRight } from 'lucide-react';
import heroDashboardOverlay from '@/../docs/marketing/assets/use-cases/navet-hero-dashboard-overlay.png';
import heroCompositeImage from '@/../docs/marketing/assets/use-cases/navet-hero-device-composite.png';
import { Button, Heading, Link, Text } from '@/app/components/primitives';
import { getMarketingWebsitePath } from '@/app/marketing/constants/marketingLinks';
import { MARKETING_HERO_CONTENT } from '@/app/marketing/data/marketingContent';
import { GithubMark } from '@/app/marketing/icons/GithubMark';

export function MarketingHeroSection() {
  const [primaryDemoCta, primaryInstallCta] = MARKETING_HERO_CONTENT.primaryCtas;

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
      <div className="relative min-h-[620px] sm:min-h-[700px] lg:min-h-[780px]">
        <img
          src={heroCompositeImage}
          alt="Warm modern living space used as the background for the Navet marketing hero"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,13,0.88)_0%,rgba(6,8,13,0.58)_28%,rgba(6,8,13,0.18)_56%,rgba(6,8,13,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,13,0.26)_0%,rgba(6,8,13,0.12)_38%,rgba(6,8,13,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_72%_22%,rgba(245,158,11,0.1),transparent_22%),radial-gradient(circle_at_52%_110%,rgba(6,8,13,0.96),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(6,8,13,0)_0%,rgba(6,8,13,0.32)_24%,rgba(6,8,13,0.72)_58%,rgba(6,8,13,0.96)_100%)] sm:h-40 lg:h-48" />
        <div className="pointer-events-none absolute inset-x-[8%] bottom-[-4.5rem] h-28 rounded-[999px] bg-[#06080d] opacity-90 blur-3xl sm:bottom-[-5rem] sm:h-32 lg:bottom-[-5.5rem] lg:h-36" />

        <div className="relative mx-auto grid min-h-[620px] w-full max-w-[1320px] items-end gap-10 px-4 pb-14 pt-20 sm:min-h-[700px] sm:px-6 sm:pb-16 lg:min-h-[780px] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 lg:px-8 lg:pb-20">
          <div className="max-w-[640px] space-y-6">
            <div className="space-y-4">
              <Heading as="h1" className="max-w-[10ch] text-4xl leading-tight md:text-6xl">
                A{' '}
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
                  beautiful
                </AnimatedGradientText>{' '}
                dashboard for <span className="whitespace-nowrap">your smart home</span>
              </Heading>
              <Text className="max-w-2xl text-base leading-7 text-white/78 md:text-xl md:leading-8">
                {MARKETING_HERO_CONTENT.subheadline}
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
              <Button
                variant="secondary"
                className="justify-center border-white/18 bg-white/8 text-white backdrop-blur-sm hover:bg-white/12 sm:justify-start"
                onClick={() => {
                  window.location.assign(getMarketingWebsitePath(primaryInstallCta.href));
                }}
              >
                {primaryInstallCta.label}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={MARKETING_HERO_CONTENT.secondaryCta.href}
                target="_blank"
                rel="noreferrer"
                showExternalIcon
                className="text-white"
              >
                <GithubMark className="h-4 w-4" />
                {MARKETING_HERO_CONTENT.secondaryCta.label}
              </Link>
              <Text className="text-white/64">Wall panels, tablets, desktops, and phones.</Text>
            </div>
          </div>
          <div className="relative hidden min-h-[360px] lg:flex lg:items-end lg:justify-end">
            <div className="pointer-events-none absolute right-[8%] top-[12%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.42),transparent_72%)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-[12%] right-[18%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)] blur-3xl" />
            <div className="relative w-full max-w-[980px] translate-x-[12%] -translate-y-[2rem] drop-shadow-[0_48px_120px_rgba(0,0,0,0.68)] xl:max-w-[1080px] xl:translate-x-[14%] xl:-translate-y-[2.5rem]">
              <img
                src={heroDashboardOverlay}
                alt="Navet dashboard product preview shown on a tablet-style device"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
