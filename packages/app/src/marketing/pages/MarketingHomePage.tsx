import { MarketingCurrentSupportSection } from '@navet/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingDemoCtaSection } from '@navet/app/marketing/sections/MarketingDemoCtaSection';
import { MarketingFeatureGridSection } from '@navet/app/marketing/sections/MarketingFeatureGridSection';
import { MarketingHeroSection } from '@navet/app/marketing/sections/MarketingHeroSection';
import { MarketingProductPreviewSection } from '@navet/app/marketing/sections/MarketingProductPreviewSection';
import { MarketingThemeShowcaseSection } from '@navet/app/marketing/sections/MarketingThemeShowcaseSection';

export function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingProductPreviewSection />
      <MarketingFeatureGridSection />
      <MarketingThemeShowcaseSection />
      <MarketingDemoCtaSection />
      <MarketingCurrentSupportSection />
    </>
  );
}
