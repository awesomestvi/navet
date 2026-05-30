import { MarketingCurrentSupportSection } from '@/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingDemoCtaSection } from '@/app/marketing/sections/MarketingDemoCtaSection';
import { MarketingFeatureGridSection } from '@/app/marketing/sections/MarketingFeatureGridSection';
import { MarketingHeroSection } from '@/app/marketing/sections/MarketingHeroSection';
import { MarketingInstallOptionsSection } from '@/app/marketing/sections/MarketingInstallOptionsSection';
import { MarketingProductPreviewSection } from '@/app/marketing/sections/MarketingProductPreviewSection';
import { MarketingRoadmapSection } from '@/app/marketing/sections/MarketingRoadmapSection';
import { MarketingThemeShowcaseSection } from '@/app/marketing/sections/MarketingThemeShowcaseSection';

export function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingProductPreviewSection />
      <MarketingFeatureGridSection />
      <MarketingThemeShowcaseSection />
      <MarketingDemoCtaSection />
      <MarketingInstallOptionsSection />
      <MarketingCurrentSupportSection />
      <MarketingRoadmapSection />
    </>
  );
}
