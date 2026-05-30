import { ArrowRight } from 'lucide-react';
import { Button, Heading, Link, Panel, Text } from '@/app/components/primitives';
import { useTheme } from '@/app/hooks';
import { getMarketingWebsitePath } from '@/app/marketing/constants/marketingLinks';
import { MARKETING_HERO_CONTENT } from '@/app/marketing/data/marketingContent';
import { MARKETING_SCREENSHOTS } from '@/app/marketing/data/marketingDemoData';
import { GithubMark } from '@/app/marketing/icons/GithubMark';
import { MarketingProductPreview } from '@/app/marketing/sections/MarketingProductPreviewSection';

export function MarketingHeroSection() {
  const [primaryDemoCta, primaryInstallCta] = MARKETING_HERO_CONTENT.primaryCtas;
  const { theme } = useTheme();

  return (
    <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
      <div className="space-y-6">
        <div className="space-y-4">
          <Text
            as="div"
            className={
              theme === 'light'
                ? 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-600'
                : 'text-xs font-semibold uppercase tracking-[0.24em] text-white/64'
            }
          >
            Home Assistant as the brain. Navet as the beautiful frontend.
          </Text>
          <Heading as="h1" className="text-4xl leading-tight md:text-6xl">
            {MARKETING_HERO_CONTENT.headline}
          </Heading>
          <Text className="max-w-2xl text-base leading-7 md:text-xl md:leading-8">
            {MARKETING_HERO_CONTENT.subheadline}
          </Text>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="justify-center sm:justify-start"
            onClick={() => {
              window.location.assign(primaryDemoCta.href);
            }}
          >
            <span className="inline-flex items-center gap-2">
              {primaryDemoCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Button>
          <Button
            variant="secondary"
            className="justify-center sm:justify-start"
            onClick={() => {
              window.location.assign(getMarketingWebsitePath(primaryInstallCta.href));
            }}
          >
            {primaryInstallCta.label}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={MARKETING_HERO_CONTENT.secondaryCta.href}
            target="_blank"
            rel="noreferrer"
            showExternalIcon
          >
            <GithubMark className="h-4 w-4" />
            {MARKETING_HERO_CONTENT.secondaryCta.label}
          </Link>
          <Text tone="muted">Wall panels, tablets, desktops, and phones.</Text>
        </div>
      </div>

      <div className="space-y-5">
        <MarketingProductPreview compact />
        <div className="grid gap-3 sm:grid-cols-3">
          {MARKETING_SCREENSHOTS.map((screenshot) => (
            <Panel key={screenshot.label} className="overflow-hidden p-0">
              <img
                src={screenshot.src}
                alt={screenshot.alt}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              <div className="px-4 py-3">
                <Text className="font-medium">{screenshot.label}</Text>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  );
}
