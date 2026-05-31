import { MarketingCurrentSupportSection } from '@navet/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingDemoCtaSection } from '@navet/app/marketing/sections/MarketingDemoCtaSection';
import { MarketingFeatureGridSection } from '@navet/app/marketing/sections/MarketingFeatureGridSection';
import { MarketingHeroSection } from '@navet/app/marketing/sections/MarketingHeroSection';
import { MarketingInstallOptionsSection } from '@navet/app/marketing/sections/MarketingInstallOptionsSection';
import { MarketingProductPreviewSection } from '@navet/app/marketing/sections/MarketingProductPreviewSection';
import { MarketingRoadmapSection } from '@navet/app/marketing/sections/MarketingRoadmapSection';
import { MarketingThemeShowcaseSection } from '@navet/app/marketing/sections/MarketingThemeShowcaseSection';

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
