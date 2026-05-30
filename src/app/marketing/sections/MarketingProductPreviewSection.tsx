import { CalendarCard } from '@/app/features/calendar';
import { HVACCard } from '@/app/features/climate';
import { MediaCard } from '@/app/features/media';
import { VacuumCard } from '@/app/features/vacuum';
import { WeatherCard } from '@/app/features/weather';
import { MARKETING_PREVIEW_CARDS } from '@/app/marketing/data/marketingDemoData';
import { MarketingSectionShell } from '@/app/marketing/shell/MarketingSectionShell';

const noopCardSizeChange = () => undefined;
const inertProps = { inert: '' } as Record<string, string>;

export function MarketingProductPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      {...inertProps}
      aria-hidden="true"
      className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_45%,rgba(5,10,18,0.85)_100%)] p-4 shadow-[0_34px_80px_-48px_rgba(2,8,20,0.9)] backdrop-blur-xl"
    >
      <div className={compact ? 'grid gap-3 md:grid-cols-2' : 'grid gap-4 xl:grid-cols-2'}>
        <WeatherCard {...MARKETING_PREVIEW_CARDS.weather} onSizeChange={noopCardSizeChange} />
        <MediaCard {...MARKETING_PREVIEW_CARDS.media} onSizeChange={noopCardSizeChange} />
        <HVACCard {...MARKETING_PREVIEW_CARDS.hvac} onSizeChange={noopCardSizeChange} />
        <VacuumCard {...MARKETING_PREVIEW_CARDS.vacuum} onSizeChange={noopCardSizeChange} />
        {!compact ? (
          <CalendarCard {...MARKETING_PREVIEW_CARDS.calendar} onSizeChange={noopCardSizeChange} />
        ) : null}
      </div>
    </div>
  );
}

export function MarketingProductPreviewSection() {
  return (
    <MarketingSectionShell
      eyebrow="Product preview"
      title="See Navet as the product"
      description="The preview uses real Navet cards with static demo data so the marketing site feels like the actual dashboard, not a generic smart-home mockup."
    >
      <MarketingProductPreview />
    </MarketingSectionShell>
  );
}
