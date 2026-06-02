import { Button, Panel, Text } from '@navet/app/components/primitives';
import { MarketingResponsiveImage } from '@navet/app/marketing/components/MarketingResponsiveImage';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_SCREENSHOTS } from '@navet/app/marketing/data/marketingDemoData';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ArrowUpRight } from 'lucide-react';

export function MarketingDemoCtaSection({ className }: { className?: string }) {
  const heroScreenshot = MARKETING_SCREENSHOTS[0];

  return (
    <MarketingSectionShell
      title="Use the demo. Then run it at home."
      description="The public demo uses realistic fixture data and the actual UI surface, so you can judge the product before connecting your own provider runtime."
      variant="editorial"
      className={className}
    >
      <Panel className="grid gap-6 overflow-hidden p-0 lg:grid-cols-[1.1fr_0.9fr]">
        <MarketingResponsiveImage
          src={heroScreenshot.src}
          sources={heroScreenshot.sources}
          alt={heroScreenshot.alt}
          className="h-full min-h-[280px] w-full object-cover"
          loading="lazy"
        />
        <div className="space-y-4 p-6 md:p-8">
          <Text className="text-base font-semibold">Static sample data. Real Navet UI.</Text>
          <Text tone="muted">
            Explore the layout, cards, widgets, and theme surfaces without signing into a provider
            first.
          </Text>
          <Button
            onClick={() => {
              window.location.assign(MARKETING_URLS.demo);
            }}
          >
            <span className="inline-flex items-center gap-2">
              Open demo
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Button>
        </div>
      </Panel>
    </MarketingSectionShell>
  );
}
