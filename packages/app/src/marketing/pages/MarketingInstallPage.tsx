import { MarketingCurrentSupportSection } from '@navet/app/marketing/sections/MarketingCurrentSupportSection';
import { MarketingHeroSection } from '@navet/app/marketing/sections/MarketingHeroSection';
import { MarketingInstallOptionsSection } from '@navet/app/marketing/sections/MarketingInstallOptionsSection';

export function MarketingInstallPage() {
  return (
    <>
      <MarketingHeroSection />
      <MarketingInstallOptionsSection />
      <MarketingCurrentSupportSection />
    </>
  );
}
