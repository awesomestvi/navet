import { Badge, Panel, Text } from '@/app/components/primitives';
import { MARKETING_CURRENT_SUPPORT } from '@/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@/app/marketing/shell/MarketingSectionShell';

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
      description="Navet currently focuses on common Home Assistant entities and mature dashboard paths, with more coverage planned. The lists below reflect current repo documentation rather than future claims."
    >
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
