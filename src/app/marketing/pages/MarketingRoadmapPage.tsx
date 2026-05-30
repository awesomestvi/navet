import { MarketingCurrentSupportSection } from '@/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingHeroSection } from '@/app/marketing/sections/MarketingHeroSection';
import { MarketingRoadmapSection } from '@/app/marketing/sections/MarketingRoadmapSection';

export function MarketingRoadmapPage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingRoadmapSection />
      <MarketingCurrentSupportSection />
    </>
  );
}
