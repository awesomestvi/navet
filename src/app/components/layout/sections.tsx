import { Clipboard, Lightbulb, Lock, type LucideIcon, Tv, Video } from 'lucide-react';
import { type CSSProperties, memo, type ReactNode } from 'react';
import {
  type CardSize,
  getCardSpanClass,
  getDashboardGridColumnCount,
} from '@/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { DashboardCardItem } from '@/app/features/dashboard';
import { useCardState, useDevices, useEditMode, useI18n, useTheme } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import type { DeviceCollection, DeviceWithType } from '@/app/types/device.types';
import { EmptyState } from '../shared/empty-state';
import { SectionCustomizeShell } from './section-customize-shell';

function DeviceSectionLayout({
  devices,
  rawDevices,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  title,
  singularLabel,
  pluralLabel,
  customizable = false,
}: {
  devices: DeviceWithType[];
  rawDevices: DeviceCollection;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  title: string;
  singularLabel: string;
  pluralLabel: string;
  customizable?: boolean;
}) {
  const { isEditMode, toggleEditMode } = useEditMode();

  if (devices.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  const content = (
    <EntityGrid
      devices={devices}
      rawDevices={rawDevices}
      title={title}
      singularLabel={singularLabel}
      pluralLabel={pluralLabel}
      isEditMode={isEditMode}
    />
  );

  if (!customizable) {
    return content;
  }

  return (
    <SectionCustomizeShell isEditMode={isEditMode} onToggle={toggleEditMode} className="relative">
      {content}
    </SectionCustomizeShell>
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
      customizable
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
      customizable
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
  const { isEditMode, toggleEditMode } = useEditMode();
  const mediaDevices = devices.media.map((d) => ({ ...d, type: 'media' as const }));

  if (mediaDevices.length === 0) {
    return (
      <EmptyState
        icon={Tv}
        title={t('sections.media.emptyTitle')}
        description={t('sections.media.emptyDescription')}
      />
    );
  }

  const audioTypes = new Set([
    t('media.type.player'),
    t('media.type.speaker'),
    t('media.type.receiver'),
    t('media.type.soundbar'),
  ]);
  const tvType = t('media.type.tv');

  const audioDevices = mediaDevices.filter((device) =>
    audioTypes.has(
      typeof device.entityType === 'string' ? device.entityType : t('media.type.player')
    )
  );
  const tvDevices = mediaDevices.filter((device) => device.entityType === tvType);

  const otherGroups = mediaDevices
    .filter((device) => !audioDevices.includes(device) && !tvDevices.includes(device))
    .reduce<Map<string, DeviceWithType[]>>((groups, device) => {
      const label =
        typeof device.entityType === 'string' && device.entityType.trim()
          ? device.entityType
          : t('media.type.player');
      const existing = groups.get(label);
      if (existing) {
        existing.push(device);
      } else {
        groups.set(label, [device]);
      }
      return groups;
    }, new Map());

  const sections: Array<{ key: string; title: string; devices: DeviceWithType[] }> = [];

  if (audioDevices.length > 0) {
    sections.push({
      key: 'audio',
      title: 'Players & speakers',
      devices: audioDevices,
    });
  }

  if (tvDevices.length > 0) {
    sections.push({
      key: 'tv',
      title: 'TVs',
      devices: tvDevices,
    });
  }

  for (const [label, groupedDevices] of otherGroups) {
    sections.push({
      key: label,
      title: groupedDevices.length > 1 ? `${label}s` : label,
      devices: groupedDevices,
    });
  }

  return (
    <SectionCustomizeShell
      isEditMode={isEditMode}
      onToggle={toggleEditMode}
      className="relative space-y-8"
    >
      {sections.map((section) => (
        <EntityGrid
          key={section.key}
          devices={section.devices}
          rawDevices={devices}
          title={section.title}
          singularLabel={section.title}
          pluralLabel={section.title}
          isEditMode={isEditMode}
          cardSizeStorageKey="mediaSectionCardSizes"
        />
      ))}
    </SectionCustomizeShell>
  );
}

const EntityGrid = memo(function EntityGrid({
  devices,
  rawDevices,
  title,
  singularLabel,
  pluralLabel,
  isEditMode = false,
  cardSizeStorageKey = 'cardSizes',
  headerAction,
}: {
  devices: DeviceWithType[];
  rawDevices: DeviceCollection;
  title: string;
  singularLabel: string;
  pluralLabel: string;
  isEditMode?: boolean;
  cardSizeStorageKey?: keyof typeof STORAGE_KEYS;
  headerAction?: ReactNode;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const breakpointCols = useBreakpointCols();
  const { cardSizes, updateCardSize } = useCardState(rawDevices, cardSizeStorageKey);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>{title}</h2>
          <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
            {devices.length} {devices.length === 1 ? singularLabel : pluralLabel}
          </span>
        </div>
        {headerAction}
      </div>
      <div
        className="grid w-full auto-rows-[87px] grid-flow-row-dense gap-2 md:gap-3 lg:gap-4"
        style={
          {
            gridTemplateColumns: `repeat(${getDashboardGridColumnCount(breakpointCols)}, minmax(0, 1fr))`,
          } as CSSProperties
        }
      >
        {devices.map((device) => {
          const size = (cardSizes[device.id] ?? device.size) as CardSize;

          return (
            <div key={device.id} className={getCardSpanClass(size)}>
              <DashboardCardItem
                id={device.id}
                device={device}
                size={size}
                isEditMode={isEditMode}
                handleSizeChange={updateCardSize}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
});
