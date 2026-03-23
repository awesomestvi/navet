import { Clipboard, Lightbulb, Lock, type LucideIcon, Tv, Video } from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { type CardSize, getCardSpanClass } from '@/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { renderCard } from '@/app/features/dashboard';
import { useCardState, useDevices, useI18n, useTheme } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import type { DeviceCollection, DeviceWithType } from '@/app/types/device.types';
import { EmptyState } from '../shared/empty-state';

function DeviceSectionLayout({
  devices,
  rawDevices,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  title,
  singularLabel,
  pluralLabel,
}: {
  devices: DeviceWithType[];
  rawDevices: DeviceCollection;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  title: string;
  singularLabel: string;
  pluralLabel: string;
}) {
  if (devices.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <EntityGrid
      devices={devices}
      rawDevices={rawDevices}
      title={title}
      singularLabel={singularLabel}
      pluralLabel={pluralLabel}
    />
  );
}

export function SecuritySection() {
  const { t } = useI18n();
  const devices = useDevices();
  return (
    <DeviceSectionLayout
      devices={devices.cameras.map((d) => ({ ...d, type: 'cameras' as const }))}
      rawDevices={devices}
      emptyIcon={Video}
      emptyTitle={t('sections.security.emptyTitle')}
      emptyDescription={t('sections.security.emptyDescription')}
      title={t('sections.security.title')}
      singularLabel={t('sections.security.singular')}
      pluralLabel={t('sections.security.plural')}
    />
  );
}

export function TasksSection() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Clipboard}
      title={t('sections.tasks.emptyTitle')}
      description={t('sections.tasks.emptyDescription')}
    />
  );
}

export function LocksSection() {
  const { t } = useI18n();
  const devices = useDevices();
  return (
    <DeviceSectionLayout
      devices={devices.locks.map((d) => ({ ...d, type: 'locks' as const }))}
      rawDevices={devices}
      emptyIcon={Lock}
      emptyTitle={t('sections.locks.emptyTitle')}
      emptyDescription={t('sections.locks.emptyDescription')}
      title={t('sections.locks.title')}
      singularLabel={t('sections.locks.singular')}
      pluralLabel={t('sections.locks.plural')}
    />
  );
}

export function LightsSection() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={Lightbulb}
      title={t('sections.lights.emptyTitle')}
      description={t('sections.lights.emptyDescription')}
    />
  );
}

export function MediaSection() {
  const { t } = useI18n();
  const devices = useDevices();
  return (
    <DeviceSectionLayout
      devices={devices.media.map((d) => ({ ...d, type: 'media' as const }))}
      rawDevices={devices}
      emptyIcon={Tv}
      emptyTitle={t('sections.media.emptyTitle')}
      emptyDescription={t('sections.media.emptyDescription')}
      title={t('sections.media.title')}
      singularLabel={t('sections.media.singular')}
      pluralLabel={t('sections.media.plural')}
    />
  );
}

const EntityGrid = memo(function EntityGrid({
  devices,
  rawDevices,
  title,
  singularLabel,
  pluralLabel,
}: {
  devices: DeviceWithType[];
  rawDevices: DeviceCollection;
  title: string;
  singularLabel: string;
  pluralLabel: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const breakpointCols = useBreakpointCols();
  const { cardSizes, updateCardSize } = useCardState(rawDevices);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>{title}</h2>
        <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
          {devices.length} {devices.length === 1 ? singularLabel : pluralLabel}
        </span>
      </div>
      <div
        className="grid w-full auto-rows-[87px] grid-flow-row-dense gap-2 md:gap-3 lg:gap-4"
        style={
          {
            gridTemplateColumns: `repeat(${breakpointCols}, minmax(0, 1fr))`,
          } as CSSProperties
        }
      >
        {devices.map((device) => {
          const size = (cardSizes[device.id] ?? device.size) as CardSize;

          return (
            <div key={device.id} className={getCardSpanClass(size)}>
              {renderCard({
                device: { ...device, size },
                size,
                handleSizeChange: updateCardSize,
                isEditMode: false,
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
});
