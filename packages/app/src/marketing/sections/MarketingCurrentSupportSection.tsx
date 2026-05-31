import homeAssistantLogo from '@navet/app/assets/providers/home-assistant.svg';
import homeyLogo from '@navet/app/assets/providers/homey.png';
import openhabLogo from '@navet/app/assets/providers/openhab.svg';
import { Badge, Panel, Text } from '@navet/app/components/primitives';
import { MARKETING_CURRENT_SUPPORT } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';

const SUPPORTED_PROVIDER_LOGOS = [
  {
    name: 'Home Assistant',
    src: homeAssistantLogo,
    alt: 'Home Assistant logo',
  },
  {
    name: 'Homey',
    src: homeyLogo,
    alt: 'Homey logo',
  },
  {
    name: 'openHAB',
    src: openhabLogo,
    alt: 'openHAB logo',
  },
] as const;

function SupportGroup({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <Panel className="space-y-4">
      <Text className="text-base font-semibold">{title}</Text>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
    </Panel>
  );
}

export function MarketingCurrentSupportSection() {
  return (
    <MarketingSectionShell
      eyebrow="Current support"
      title="Focused on what works today"
      description="Navet currently supports Home Assistant, Homey, and openHAB. The architecture is provider-neutral, but maturity is still uneven, with Home Assistant the most complete path today. The lists below reflect current repo documentation rather than future claims."
    >
      <Panel className="space-y-5">
        <Text className="text-base font-semibold">Supported platforms today</Text>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUPPORTED_PROVIDER_LOGOS.map((provider) => (
            <div
              key={provider.name}
              className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/4 px-4 py-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <img
                  src={provider.src}
                  alt={provider.alt}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <Text className="font-medium">{provider.name}</Text>
                <Text tone="muted">Available in Navet today</Text>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <SupportGroup title="Supported providers" items={MARKETING_CURRENT_SUPPORT.providers} />
        <SupportGroup
          title="Dedicated dashboard sections"
          items={MARKETING_CURRENT_SUPPORT.dashboardSections}
        />
        <SupportGroup title="Entity card coverage" items={MARKETING_CURRENT_SUPPORT.cards} />
        <SupportGroup title="Custom widgets" items={MARKETING_CURRENT_SUPPORT.widgets} />
      </div>
    </MarketingSectionShell>
  );
}
