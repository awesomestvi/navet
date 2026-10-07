import { MarketingCardsDetailsSection } from '@navet/app/marketing/sections/MarketingCardsDetailsSection';
import { MarketingCardsSection } from '@navet/app/marketing/sections/MarketingCardsSection';

export function MarketingCardsPage() {
  return (
    <>
      <MarketingCardsSection landing />
      <MarketingCardsDetailsSection />
    </>
  );
}
