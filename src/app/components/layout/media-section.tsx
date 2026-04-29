import { Tv } from 'lucide-react';
import { useMemo } from 'react';
import { DashboardEmptyState } from '@/app/components/patterns';
import { useDevices, useEditMode, useI18n } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import { EntityGrid } from './entity-grid';
import { SectionCustomizeShell } from './section-customize-shell';

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
