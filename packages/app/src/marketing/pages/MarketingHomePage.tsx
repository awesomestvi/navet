import { MarketingDeferredSection } from '@navet/app/marketing/components/MarketingDeferredSection';
import { MarketingHeroSection } from '@navet/app/marketing/sections/MarketingHeroSection';
import { lazy } from 'react';

const MarketingProductPreviewSection = lazy(async () => {
  const module = await import('@navet/app/marketing/sections/MarketingProductPreviewSection');
  return { default: module.MarketingProductPreviewSection };
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
    <div aria-hidden="true" className={[className, minHeightClassName].filter(Boolean).join(' ')} />
  );
}

export function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingDeferredSection
        fallback={
          <DeferredSectionFallback
            className="mt-10 sm:mt-14 md:mt-18 lg:mt-20"
            minHeightClassName="min-h-[640px] sm:min-h-[760px]"
          />
        }
      >
        <MarketingProductPreviewSection className="mt-10 sm:mt-14 md:mt-18 lg:mt-20" />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={
          <DeferredSectionFallback
            className="mt-10 sm:mt-14 md:mt-36 lg:mt-40"
            minHeightClassName="min-h-[560px] sm:min-h-[720px]"
          />
        }
      >
        <MarketingFeatureGridSection className="mt-10 sm:mt-14 md:mt-36 lg:mt-40" />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={
          <DeferredSectionFallback
            className="mt-10 sm:mt-14 md:mt-36 lg:mt-40"
            minHeightClassName="min-h-[340px] sm:min-h-[420px]"
          />
        }
      >
        <MarketingThemeShowcaseSection className="mt-10 sm:mt-14 md:mt-36 lg:mt-40" />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={
          <DeferredSectionFallback
            className="mt-10 sm:mt-14 md:mt-36 lg:mt-40"
            minHeightClassName="min-h-[220px] sm:min-h-[240px]"
          />
        }
      >
        <MarketingPrivacySection className="mt-10 sm:mt-14 md:mt-36 lg:mt-40" />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={
          <DeferredSectionFallback
            className="mt-10 sm:mt-14 md:mt-36 lg:mt-40"
            minHeightClassName="min-h-[280px] sm:min-h-[320px]"
          />
        }
      >
        <MarketingDemoCtaSection className="mt-10 sm:mt-14 md:mt-36 lg:mt-40" />
      </MarketingDeferredSection>
      <MarketingDeferredSection
        fallback={
          <DeferredSectionFallback
            className="mt-10 sm:mt-14 md:mt-36 lg:mt-40"
            minHeightClassName="min-h-[260px] sm:min-h-[280px]"
          />
        }
      >
        <MarketingCurrentSupportSection className="mt-10 sm:mt-14 md:mt-36 lg:mt-40" />
      </MarketingDeferredSection>
    </>
  );
}
