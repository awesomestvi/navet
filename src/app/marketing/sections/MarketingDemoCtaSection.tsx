import { ArrowUpRight } from 'lucide-react';
import { Button, Panel, Text } from '@/app/components/primitives';
import { MARKETING_URLS } from '@/app/marketing/constants/marketingLinks';
import { MARKETING_SCREENSHOTS } from '@/app/marketing/data/marketingDemoData';
import { MarketingSectionShell } from '@/app/marketing/shell/MarketingSectionShell';

export function MarketingDemoCtaSection() {
  const heroScreenshot = MARKETING_SCREENSHOTS[0];

  return (
    <MarketingSectionShell
      eyebrow="Demo"
      title="Try Navet before installing"
      description="Explore a demo dashboard with sample smart-home data and see how Navet feels on different screen sizes."
    >
      <Panel className="grid gap-6 overflow-hidden p-0 lg:grid-cols-[1.1fr_0.9fr]">
        <img
          src={heroScreenshot.src}
          alt={heroScreenshot.alt}
          className="h-full min-h-[280px] w-full object-cover"
          loading="lazy"
        />
        <div className="space-y-4 p-6 md:p-8">
          <Text className="text-base font-semibold">Static sample data, real Navet UI</Text>
          <Text tone="muted">
            The public demo uses realistic fixtures so you can explore the layout, cards, and theme
            direction without connecting your own provider runtime.
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
