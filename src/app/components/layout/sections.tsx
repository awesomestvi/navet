import { Clipboard, Lightbulb, Lock, type LucideIcon, Tv, Video } from 'lucide-react';
import { type CSSProperties, memo, type ReactNode, useMemo } from 'react';
import {
  CARD_GRID_ROW_CLASS,
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
import { DashboardEmptyState } from '../patterns/dashboard-empty-state';
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
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          className="w-full max-w-md"
        />
      </div>
    );
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
    <div className="flex h-full items-center justify-center p-6">
      <DashboardEmptyState
        icon={Clipboard}
        title={t('sections.tasks.emptyTitle')}
        description={t('sections.tasks.emptyDescription')}
        className="w-full max-w-md"
      />
    </div>
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
    <div className="flex h-full items-center justify-center p-6">
      <DashboardEmptyState
        icon={Lightbulb}
        title={t('sections.lights.emptyTitle')}
        description={t('sections.lights.emptyDescription')}
        className="w-full max-w-md"
      />
    </div>
  );
}

export function MediaSection() {
  const { t } = useI18n();
  const devices = useDevices();
  const { isEditMode, toggleEditMode } = useEditMode();
  const mediaDevices = useMemo(
    () => devices.media.map((d) => ({ ...d, type: 'media' as const })),
    [devices.media]
  );

  const playerType = t('media.type.player');
  const speakerType = t('media.type.speaker');
  const receiverType = t('media.type.receiver');
  const soundbarType = t('media.type.soundbar');
  const tvType = t('media.type.tv');
  const audioTitle = t('sections.media.audio.title');
  const audioSingular = t('sections.media.audio.singular');
  const audioPlural = t('sections.media.audio.plural');
  const tvTitle = t('sections.media.tv.title');
  const tvSingular = t('sections.media.tv.singular');
  const tvPlural = t('sections.media.tv.plural');

  const sections = useMemo(() => {
    const audioTypes = new Set([playerType, speakerType, receiverType, soundbarType]);
    const audioDevices: DeviceWithType[] = [];
    const tvDevices: DeviceWithType[] = [];
    const otherGroups = new Map<string, DeviceWithType[]>();

    for (const device of mediaDevices) {
      const typeLabel =
        typeof device.entityType === 'string' && device.entityType.trim()
          ? device.entityType
          : playerType;

      if (audioTypes.has(typeLabel)) {
        audioDevices.push(device);
        continue;
      }

      if (typeLabel === tvType) {
        tvDevices.push(device);
        continue;
      }

      const existing = otherGroups.get(typeLabel);
      if (existing) {
        existing.push(device);
      } else {
        otherGroups.set(typeLabel, [device]);
      }
    }

    const groupedSections: Array<{
      key: string;
      title: string;
      singularLabel: string;
      pluralLabel: string;
      devices: DeviceWithType[];
    }> = [];

    if (audioDevices.length > 0) {
      groupedSections.push({
        key: 'audio',
        title: audioTitle,
        singularLabel: audioSingular,
        pluralLabel: audioPlural,
        devices: audioDevices,
      });
    }

    if (tvDevices.length > 0) {
      groupedSections.push({
        key: 'tv',
        title: tvTitle,
        singularLabel: tvSingular,
        pluralLabel: tvPlural,
        devices: tvDevices,
      });
    }

    for (const [label, groupedDevices] of otherGroups) {
      const groupTitle = groupedDevices.length > 1 ? `${label}s` : label;

      groupedSections.push({
        key: label,
        title: groupTitle,
        singularLabel: label,
        pluralLabel: groupTitle,
        devices: groupedDevices,
      });
    }

    return groupedSections;
  }, [
    audioPlural,
    audioSingular,
    audioTitle,
    mediaDevices,
    playerType,
    receiverType,
    soundbarType,
    speakerType,
    tvPlural,
    tvSingular,
    tvTitle,
    tvType,
  ]);

  if (mediaDevices.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Tv}
          title={t('sections.media.emptyTitle')}
          description={t('sections.media.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
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
          singularLabel={section.singularLabel}
          pluralLabel={section.pluralLabel}
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
        className={`grid w-full ${CARD_GRID_ROW_CLASS} grid-flow-row-dense gap-2 md:gap-3 lg:gap-4`}
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
