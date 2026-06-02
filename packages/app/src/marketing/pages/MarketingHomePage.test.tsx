import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@navet/app/marketing/components/MarketingDeferredSection', () => ({
  MarketingDeferredSection: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@navet/app/marketing/sections/MarketingHeroSection', () => ({
  MarketingHeroSection: () => <section>Hero section</section>,
}));

vi.mock('@navet/app/marketing/sections/MarketingProductPreviewSection', () => ({
  MarketingProductPreviewSection: () => <section>Product preview section</section>,
}));

vi.mock('@navet/app/marketing/sections/MarketingFeatureGridSection', () => ({
  MarketingFeatureGridSection: () => <section>Feature grid section</section>,
}));

vi.mock('@navet/app/marketing/sections/MarketingThemeShowcaseSection', () => ({
  MarketingThemeShowcaseSection: () => <section>Theme showcase section</section>,
}));

vi.mock('@navet/app/marketing/sections/MarketingPrivacySection', () => ({
  MarketingPrivacySection: () => (
    <section>
      <h2>Local by default.</h2>
      <div>Provider tokens stay local</div>
    </section>
  ),
}));

vi.mock('@navet/app/marketing/sections/MarketingDemoCtaSection', () => ({
  MarketingDemoCtaSection: () => (
    <section>
      <h2>Use the demo. Then run it at home.</h2>
    </section>
  ),
}));

vi.mock('@navet/app/marketing/sections/MarketingCurrentSupportSection', () => ({
  MarketingCurrentSupportSection: () => <section>Current support section</section>,
}));

import { MarketingHomePage } from './MarketingHomePage';

describe('MarketingHomePage', () => {
  beforeEach(() => {
    const win = window as Window & {
      cancelIdleCallback?: (id: number) => void;
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    };

    win.requestIdleCallback = ((cb: () => void) => {
      cb();
      return 1;
    }) as typeof win.requestIdleCallback;
    win.cancelIdleCallback = vi.fn();
  });

  it('keeps the privacy section in the homepage flow before the demo CTA', async () => {
    renderWithProviders(<MarketingHomePage />);

    const privacyHeading = await screen.findByRole('heading', { name: 'Local by default.' });
    const demoHeading = await screen.findByRole('heading', {
      name: 'Use the demo. Then run it at home.',
    });

    expect(privacyHeading.compareDocumentPosition(demoHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByText('Provider tokens stay local')).toBeInTheDocument();
  });
});
