import { Panel, Text } from '@/app/components/primitives';
import { MARKETING_FEATURES } from '@/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@/app/marketing/shell/MarketingSectionShell';

export function MarketingFeatureGridSection() {
  return (
    <MarketingSectionShell
      eyebrow="Why Navet"
      title="Built for everyday household control"
      description="Home Assistant is powerful, but building a polished dashboard can be frustrating. Navet keeps Home Assistant as the engine and gives you a frontend designed for everyday use."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MARKETING_FEATURES.map((feature) => {
          const Icon = feature.icon;

          return (
            <Panel key={feature.title} className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <Text className="text-base font-semibold">{feature.title}</Text>
                <Text tone="muted">{feature.description}</Text>
              </div>
            </Panel>
          );
        })}
      </div>
    </MarketingSectionShell>
  );
}
