import { MarketingCurrentSupportSection } from '@/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingHeroSection } from '@/app/marketing/sections/MarketingHeroSection';
import { MarketingInstallOptionsSection } from '@/app/marketing/sections/MarketingInstallOptionsSection';

export function MarketingInstallPage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingInstallOptionsSection />
      <MarketingCurrentSupportSection />
    </>
  );
}
