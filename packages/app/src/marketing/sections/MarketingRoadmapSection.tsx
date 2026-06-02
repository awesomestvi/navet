import { Badge, Link, Panel, Text } from '@navet/app/components/primitives';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_ROADMAP } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';

function RoadmapColumn({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <Panel className="space-y-4">
      <Badge tone="accent">{title}</Badge>
      <div className="space-y-3">
        {items.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </div>
    </Panel>
  );
}

export function MarketingRoadmapSection() {
  return (
    <MarketingSectionShell
      title={MARKETING_ROADMAP.title}
      description={MARKETING_ROADMAP.description}
      variant="editorial"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <RoadmapColumn title="Now" items={MARKETING_ROADMAP.now} />
        <RoadmapColumn title="Next" items={MARKETING_ROADMAP.next} />
        <RoadmapColumn title="Later" items={MARKETING_ROADMAP.later} />
      </div>
      <Text tone="muted">
        Full public roadmap:{' '}
        <Link href={MARKETING_URLS.roadmapDoc} target="_blank" rel="noreferrer" showExternalIcon>
          docs/ROADMAP.md
        </Link>
      </Text>
    </MarketingSectionShell>
  );
}
