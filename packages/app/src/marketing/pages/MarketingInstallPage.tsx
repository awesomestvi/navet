import { Badge, Button, Link, Panel, Text } from '@navet/app/components/primitives';
import { MarketingPillGroup } from '@navet/app/marketing/components/MarketingEditorial';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ArrowUpRight } from 'lucide-react';

const INSTALL_PILLS = ['Home Assistant', 'Homey', 'openHAB', 'Docker'] as const;

const PRIMARY_INSTALL_PATHS = [
  {
    badge: 'Recommended',
    title: 'Home Assistant Custom Panel',
    summary:
      'Best when you want Navet inside the Home Assistant sidebar with the cleanest native setup.',
    fit: 'Use this when Home Assistant is your main smart-home stack and you want the most mature Navet path today.',
    href: MARKETING_URLS.install.homeAssistantCustomPanel,
  },
  {
    badge: 'Managed',
    title: 'Home Assistant Add-on',
    summary:
      'Best when Home Assistant should own installation, updates, and the local app lifecycle.',
    fit: 'Use this when you prefer Ingress and add-on management instead of running Navet as a separate service.',
    href: MARKETING_URLS.install.homeAssistantAddon,
  },
  {
    badge: 'Flexible',
    title: 'Standalone Docker',
    summary: 'Best when you want Navet as its own app and choose the provider during sign-in.',
    fit: 'Use this when you want one deployment shape that can connect to Home Assistant, Homey, or openHAB.',
    href: MARKETING_URLS.install.standaloneDocker,
  },
] as const;

const SECONDARY_INSTALL_PATHS = [
  {
    title: 'Homey standalone',
    summary: 'Bring your own Athom Web API client and run Navet as a standalone Docker app.',
    href: MARKETING_URLS.install.homey,
  },
  {
    title: 'openHAB standalone',
    summary:
      'Run Navet in Docker and connect it directly to your browser-reachable openHAB base URL.',
    href: MARKETING_URLS.install.openhab,
  },
] as const;

const INSTALL_SOURCES = [
  {
    title: 'README getting started',
    description: 'Quick chooser for supported providers and deployment modes.',
    href: MARKETING_URLS.gettingStarted,
  },
  {
    title: 'Home Assistant guide',
    description: 'Custom panel, add-on, and standalone Docker paths in one document.',
    href: MARKETING_URLS.install.homeAssistantGuide,
  },
  {
    title: 'Homey guide',
    description: 'Standalone setup, OAuth client requirements, and callback details.',
    href: MARKETING_URLS.install.homey,
  },
  {
    title: 'openHAB guide',
    description: 'Standalone setup, base URL expectations, and auth requirements.',
    href: MARKETING_URLS.install.openhab,
  },
] as const;

function InstallPathCard({
  badge,
  title,
  summary,
  fit,
  href,
}: {
  badge: string;
  title: string;
  summary: string;
  fit: string;
  href: string;
}) {
  return (
    <Panel as="article" className="flex h-full flex-col gap-4">
      <Badge tone={badge === 'Recommended' ? 'accent' : 'neutral'}>{badge}</Badge>
      <div className="space-y-2">
        <Text className="text-base font-semibold">{title}</Text>
        <Text tone="muted">{summary}</Text>
      </div>
      <Text tone="muted" className="mt-auto text-sm leading-6">
        {fit}
      </Text>
      <Link href={href} target="_blank" rel="noreferrer" showExternalIcon>
        Read instructions on GitHub
      </Link>
    </Panel>
  );
}

function SourceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Panel as="article" className="space-y-3">
      <Text className="text-base font-semibold">{title}</Text>
      <Text tone="muted">{description}</Text>
      <Link href={href} target="_blank" rel="noreferrer" showExternalIcon>
        Open source doc
      </Link>
    </Panel>
  );
}

export function MarketingInstallPage() {
  return (
    <div className="space-y-24 md:space-y-28 lg:space-y-32">
      <section className="space-y-8">
        <Panel
          as="article"
          className="overflow-hidden border-white/12 bg-[linear-gradient(135deg,rgba(13,18,28,0.94),rgba(13,18,28,0.78))] p-0"
        >
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
            <div className="space-y-6 p-6 sm:p-8 lg:p-10">
              <Badge tone="accent">Installation</Badge>
              <div className="space-y-4">
                <h1 className="max-w-[11ch] text-[2.4rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-5xl">
                  How to install Navet
                </h1>
                <Text className="max-w-3xl text-base leading-7 text-white/76 md:text-lg">
                  Start with the deployment route that matches your provider and where you want
                  Navet to live. The step-by-step instructions stay in the GitHub repo so the
                  install source of truth stays versioned with the product.
                </Text>
              </div>
              <MarketingPillGroup items={INSTALL_PILLS} mobileBehavior="scroll" compactMobile />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="w-full justify-center sm:w-auto sm:justify-start"
                  onClick={() => {
                    window.open(MARKETING_URLS.gettingStarted, '_blank', 'noreferrer');
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    Open GitHub setup index
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-center sm:w-auto sm:justify-start"
                  onClick={() => {
                    window.open(MARKETING_URLS.docsIndex, '_blank', 'noreferrer');
                  }}
                >
                  Browse all docs
                </Button>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/[0.035] p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
              <div className="space-y-4">
                <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-white/52">
                  Quick chooser
                </Text>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Text className="text-sm font-semibold text-white">
                      Want the best-supported path?
                    </Text>
                    <Text tone="muted">Use the Home Assistant custom panel.</Text>
                  </div>
                  <div className="space-y-1.5">
                    <Text className="text-sm font-semibold text-white">
                      Want Home Assistant to manage it?
                    </Text>
                    <Text tone="muted">Use the add-on through Ingress.</Text>
                  </div>
                  <div className="space-y-1.5">
                    <Text className="text-sm font-semibold text-white">
                      Want one standalone deployment?
                    </Text>
                    <Text tone="muted">
                      Use Docker, then connect Home Assistant, Homey, or openHAB.
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <MarketingSectionShell
        title="Pick the install path that fits the home."
        description="Navet already runs in multiple deployment shapes. Start with the mature Home Assistant path, or use standalone Docker when you want one app shell across providers."
        variant="editorial"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {PRIMARY_INSTALL_PATHS.map((path) => (
            <InstallPathCard key={path.title} {...path} />
          ))}
        </div>
      </MarketingSectionShell>

      <MarketingSectionShell
        title="Standalone providers need their own guide."
        description="Homey and openHAB are available today, but their setup requirements are different enough that their GitHub docs should stay separate."
        variant="editorial"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {SECONDARY_INSTALL_PATHS.map((path) => (
            <Panel key={path.title} as="article" className="space-y-4">
              <Text className="text-base font-semibold">{path.title}</Text>
              <Text tone="muted">{path.summary}</Text>
              <Link href={path.href} target="_blank" rel="noreferrer" showExternalIcon>
                Open provider guide
              </Link>
            </Panel>
          ))}
        </div>
      </MarketingSectionShell>

      <MarketingSectionShell
        title="Install docs live in the repo."
        description="This page is the front door. The actual instructions stay in GitHub so releases, screenshots, and provider-specific requirements can change in one place."
        variant="editorial"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {INSTALL_SOURCES.map((source) => (
            <SourceCard key={source.title} {...source} />
          ))}
        </div>
        <Text tone="muted">
          Planned providers such as Hubitat and SmartThings are not installable yet, so they are not
          listed here as live setup paths.
        </Text>
      </MarketingSectionShell>
    </div>
  );
}
