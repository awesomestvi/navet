import { Badge, Link, Panel, Text } from '@navet/app/components/primitives';
import {
  MARKETING_INSTALL_OPTIONS,
  MARKETING_SECONDARY_INSTALLS,
} from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ArrowUpRight } from 'lucide-react';

export function MarketingInstallOptionsSection() {
  return (
    <MarketingSectionShell
      eyebrow="Install"
      title="Start with the most stable path"
      description="Navet supports multiple deployment shapes. The Home Assistant custom panel is the most mature path today, while add-on and standalone setups stay available when they better match your deployment."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {MARKETING_INSTALL_OPTIONS.map((option) => (
          <Panel key={option.title} className="space-y-4">
            <Badge tone={option.label === 'Recommended' ? 'accent' : 'neutral'}>
              {option.label}
            </Badge>
            <div className="space-y-2">
              <Text className="text-base font-semibold">{option.title}</Text>
              <Text tone="muted">{option.description}</Text>
            </div>
            <Link href={option.href} target="_blank" rel="noreferrer" showExternalIcon>
              Open setup guide
            </Link>
          </Panel>
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        {MARKETING_SECONDARY_INSTALLS.map((option) => (
          <Link
            key={option.title}
            href={option.href}
            target="_blank"
            rel="noreferrer"
            showExternalIcon
          >
            {option.title}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </MarketingSectionShell>
  );
}
