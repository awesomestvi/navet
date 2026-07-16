import { Link, Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_ROADMAP } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { ArrowRight, Check, Circle } from 'lucide-react';

const ROADMAP_PHASES = [
  {
    id: 'now',
    label: 'Now',
    eyebrow: 'Shipping today',
    description: 'Built, documented, and available in current Navet releases.',
    items: MARKETING_ROADMAP.now,
  },
  {
    id: 'next',
    label: 'Next',
    eyebrow: 'Product depth',
    description: 'The next layer of dashboard flexibility and everyday control.',
    items: MARKETING_ROADMAP.next,
  },
  {
    id: 'later',
    label: 'Later',
    eyebrow: 'Provider reach',
    description: 'Broader support after the current integrations become more mature.',
    items: MARKETING_ROADMAP.later,
  },
] as const;

type RoadmapPhase = (typeof ROADMAP_PHASES)[number];

function PhaseItemMarker({ phaseId }: { phaseId: RoadmapPhase['id'] }) {
  if (phaseId === 'now') {
    return (
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }

  if (phaseId === 'next') {
    return (
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orange-500/45 text-orange-400">
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-current/45">
      <Circle className="h-2.5 w-2.5" aria-hidden="true" />
    </span>
  );
}

function RoadmapPhaseColumn({ phase, index }: { phase: RoadmapPhase; index: number }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isNow = phase.id === 'now';

  return (
    <article
      className={cn(
        'relative border-b py-8 pl-10 last:border-b-0 lg:border-b-0 lg:py-14 lg:pr-8 lg:pl-8',
        index === 0 ? 'lg:pl-0' : 'lg:border-l',
        index === ROADMAP_PHASES.length - 1 ? 'lg:pr-0' : '',
        surface.border
      )}
    >
      {index < ROADMAP_PHASES.length - 1 ? (
        <span
          className={cn(
            'absolute top-10 bottom-[-2rem] left-[0.45rem] w-px lg:hidden',
            surface.panel
          )}
          aria-hidden="true"
        />
      ) : null}

      <span
        className={cn(
          'absolute top-[2.05rem] left-0 z-10 block h-4 w-4 rounded-full border-[3px] lg:top-[1.55rem]',
          index === 0 ? 'lg:left-0' : 'lg:left-8',
          isNow
            ? 'border-orange-500 bg-orange-500 shadow-[0_0_0_6px_rgba(249,115,22,0.11),0_0_30px_rgba(249,115,22,0.35)]'
            : phase.id === 'next'
              ? cn('border-orange-500/70', surface.panelMuted)
              : cn(surface.borderStrong, surface.panelMuted)
        )}
        aria-hidden="true"
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text
            as="span"
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.18em]',
              isNow ? 'text-orange-400' : surface.textMuted
            )}
          >
            {phase.eyebrow}
          </Text>
          <Text as="span" className={cn('text-xs tabular-nums', surface.textMuted)}>
            {phase.items.length.toString().padStart(2, '0')} items
          </Text>
        </div>
        <Text
          className={cn(
            'text-[2rem] leading-none font-semibold tracking-[-0.045em] sm:text-4xl',
            surface.textPrimary
          )}
        >
          {phase.label}
        </Text>
        <Text className={cn('max-w-[34rem] text-sm leading-6', surface.textMuted)}>
          {phase.description}
        </Text>
      </div>

      <ul className={cn('mt-7 divide-y', surface.divider)}>
        {phase.items.map((item) => (
          <li key={item} className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <PhaseItemMarker phaseId={phase.id} />
            <Text
              className={cn(
                'text-[0.95rem] leading-6',
                isNow ? surface.textPrimary : surface.textSecondary
              )}
            >
              {item}
            </Text>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function MarketingRoadmapSection() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell
      title={MARKETING_ROADMAP.title}
      description={MARKETING_ROADMAP.description}
      variant="editorial"
      compactMobile
      headingAs="h1"
    >
      <div className={cn('relative border-y', surface.borderStrong)}>
        <div
          className="pointer-events-none absolute top-[2.02rem] right-0 left-0 hidden h-px bg-[linear-gradient(90deg,rgba(249,115,22,0.8),rgba(249,115,22,0.28)_45%,rgba(161,161,170,0.18))] lg:block"
          aria-hidden="true"
        />
        <div className="grid lg:grid-cols-[1.08fr_1.08fr_0.84fr]">
          {ROADMAP_PHASES.map((phase, index) => (
            <RoadmapPhaseColumn key={phase.id} phase={phase} index={index} />
          ))}
        </div>
      </div>

      <div
        className={cn(
          'mt-6 flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between',
          surface.border
        )}
      >
        <Text tone="muted" className="text-sm">
          Full delivery notes, open questions, and provider priorities.
        </Text>
        <Link
          href={MARKETING_URLS.roadmapDoc}
          target="_blank"
          rel="noreferrer"
          showExternalIcon
          className="shrink-0"
        >
          Read the detailed roadmap
        </Link>
      </div>
    </MarketingSectionShell>
  );
}
