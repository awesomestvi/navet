import { MarketingCurrentSupportSection } from '@navet/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingHeroSection } from '@navet/app/marketing/sections/MarketingHeroSection';
import { MarketingRoadmapSection } from '@navet/app/marketing/sections/MarketingRoadmapSection';

export function MarketingRoadmapPage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingRoadmapSection />
      <MarketingCurrentSupportSection />
    </>
  );
}
