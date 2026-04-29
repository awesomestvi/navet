import type { LucideIcon } from 'lucide-react';
import { DashboardEmptyState } from '@/app/components/patterns';
import { useEditMode } from '@/app/hooks';
import type { DeviceCollection, DeviceWithType } from '@/app/types/device.types';
import { EntityGrid } from './entity-grid';
import { SectionCustomizeShell } from './section-customize-shell';

export function DeviceSectionLayout({
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
