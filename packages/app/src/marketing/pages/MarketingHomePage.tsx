import { MarketingDeferredSection } from '@navet/app/marketing/components/MarketingDeferredSection';
import { MarketingHeroSection } from '@navet/app/marketing/sections/MarketingHeroSection';
import { MarketingReleaseResourcesSection } from '@navet/app/marketing/sections/MarketingReleaseResourcesSection';
import { lazy, Suspense } from 'react';

const MarketingProductPreviewSection = lazy(async () => {
  const [sectionModule, i18nModule] = await Promise.all([
    import('@navet/app/marketing/sections/MarketingProductPreviewSection'),
    import('@navet/app/i18n/i18n-provider'),
  ]);
  return {
    default: ({ className }: { className?: string }) => (
      <i18nModule.I18nProvider>
        <sectionModule.MarketingProductPreviewSection className={className} />
      </i18nModule.I18nProvider>
    ),
  };
});

const MarketingFeatureGridSection = lazy(async () => {
  const module = await import('@navet/app/marketing/sections/MarketingFeatureGridSection');
  return { default: module.MarketingFeatureGridSection };
});

const MarketingThemeShowcaseSection = lazy(async () => {
  const module = await import('@navet/app/marketing/sections/MarketingThemeShowcaseSection');
  return { default: module.MarketingThemeShowcaseSection };
});

const MarketingPrivacySection = lazy(async () => {
  const module = await import('@navet/app/marketing/sections/MarketingPrivacySection');
  return { default: module.MarketingPrivacySection };
});

const MarketingDemoCtaSection = lazy(async () => {
  const module = await import('@navet/app/marketing/sections/MarketingDemoCtaSection');
  return { default: module.MarketingDemoCtaSection };
});

const MarketingCurrentSupportSection = lazy(async () => {
  const module = await import('@navet/app/marketing/sections/MarketingCurrentSupportSection');
  return { default: module.MarketingCurrentSupportSection };
});

function DeferredSectionFallback({
  minHeightClassName,
  className,
}: {
  minHeightClassName: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={[
        'marketing-deferred-skeleton mx-auto w-[calc(100%-2rem)] max-w-[1180px] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:w-[calc(100%-3rem)] sm:p-8 md:p-10',
        'motion-safe:animate-pulse motion-reduce:animate-none',
        className,
        minHeightClassName,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="h-2.5 w-20 rounded-full bg-orange-400/25" />
      <div className="mt-5 h-7 w-[min(72%,28rem)] rounded-full bg-white/[0.09] sm:h-9" />
      <div className="mt-3 h-3 w-[min(88%,36rem)] rounded-full bg-white/[0.055]" />
      <div className="mt-2 h-3 w-[min(62%,26rem)] rounded-full bg-white/[0.04]" />

      <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
        <div className="h-40 rounded-[1.4rem] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(249,115,22,0.08),rgba(255,255,255,0.025))] sm:h-56" />
        <div className="h-40 rounded-[1.4rem] border border-white/[0.06] bg-white/[0.035] sm:h-56" />
        <div className="h-40 rounded-[1.4rem] border border-white/[0.06] bg-[linear-gradient(215deg,rgba(249,115,22,0.06),rgba(255,255,255,0.025))] sm:h-56" />
      </div>
    </div>
  );
}

export function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection />
      <Suspense
        fallback={<DeferredSectionFallback minHeightClassName="min-h-[640px] sm:min-h-[760px]" />}
      >
        <MarketingProductPreviewSection />
      </Suspense>
      <MarketingDeferredSection
        fallback={<DeferredSectionFallback minHeightClassName="min-h-[560px] sm:min-h-[720px]" />}
      >
        <MarketingFeatureGridSection />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={<DeferredSectionFallback minHeightClassName="min-h-[340px] sm:min-h-[420px]" />}
      >
        <MarketingThemeShowcaseSection />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={<DeferredSectionFallback minHeightClassName="min-h-[220px] sm:min-h-[240px]" />}
      >
        <MarketingPrivacySection />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={<DeferredSectionFallback minHeightClassName="min-h-[260px] sm:min-h-[280px]" />}
      >
        <MarketingCurrentSupportSection />
      </MarketingDeferredSection>
      <MarketingReleaseResourcesSection />
      <MarketingDeferredSection
        fallback={<DeferredSectionFallback minHeightClassName="min-h-[280px] sm:min-h-[320px]" />}
      >
        <MarketingDemoCtaSection />
      </MarketingDeferredSection>
    </>
  );
}
