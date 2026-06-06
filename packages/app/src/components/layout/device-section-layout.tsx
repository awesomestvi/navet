import { DashboardEmptyState } from '@navet/app/components/patterns';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { useEditMode, useI18n, useTheme } from '@navet/app/hooks';
import type { DeviceCollection, DeviceWithType } from '@navet/app/types/device.types';
import { type LucideIcon, Plus } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { EntityGrid } from './entity-grid';
import { SectionCustomizeShell } from './section-customize-shell';

const AddEntityDialog = lazy(async () => {
  const module = await import('@navet/app/features/dashboard/components/add-entity-dialog');
  return { default: module.AddEntityDialog };
});

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
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { isEditMode, toggleEditMode } = useEditMode();
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const { hiddenEntityIds, hideEntity, showEntity } = useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      hideEntity: state.hideEntity,
      showEntity: state.showEntity,
    }))
  );
  const hiddenEntityIdSet = useMemo(() => new Set(hiddenEntityIds), [hiddenEntityIds]);
  const visibleDevices = useMemo(
    () => devices.filter((device) => !hiddenEntityIdSet.has(device.id)),
    [devices, hiddenEntityIdSet]
  );
  const hiddenSectionEntityIds = useMemo(
    () => devices.filter((device) => hiddenEntityIdSet.has(device.id)).map((device) => device.id),
    [devices, hiddenEntityIdSet]
  );
  const deviceMap = useMemo(() => new Map(devices.map((device) => [device.id, device])), [devices]);
  const openAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(true), []);
  const closeAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(false), []);
  const handleAddEntity = useCallback(
    (entityId: string) => {
      showEntity(entityId);
      toast.success(t('dashboard.feedback.entityAdded'));
    },
    [showEntity, t]
  );
  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      hideEntity(entityId);
      toast.success(t('dashboard.feedback.entityRemoved'), {
        id: 'dashboard-entity-removed',
      });
    },
    [hideEntity, t]
  );

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

  const addHiddenEntityAction =
    customizable && isEditMode && hiddenSectionEntityIds.length > 0 ? (
      <InteractivePill
        intent="action"
        size="small"
        onClick={openAddEntityDialog}
        className={`${surface.subtleBg} ${surface.hoverBg}`}
      >
        <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
        <span className={`hidden text-sm font-medium md:inline ${surface.textSecondary}`}>
          {t('dashboard.addEntity.title')}
        </span>
      </InteractivePill>
    ) : null;

  const content = (
    <>
      {visibleDevices.length > 0 ? (
        <EntityGrid
          devices={visibleDevices}
          rawDevices={rawDevices}
          title={title}
          singularLabel={singularLabel}
          pluralLabel={pluralLabel}
          isEditMode={isEditMode}
          onRemoveEntity={customizable ? handleRemoveEntity : undefined}
          allowEntityRemoval={customizable}
          usesHideAction={customizable}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6 pt-14">
          <DashboardEmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionIcon={Plus}
            actionLabel={t('dashboard.addEntity.title')}
            onAction={openAddEntityDialog}
            className="w-full max-w-md"
          />
        </div>
      )}

      {isAddEntityDialogOpen ? (
        <Suspense fallback={null}>
          <AddEntityDialog
            open={isAddEntityDialogOpen}
            onClose={closeAddEntityDialog}
            onAddEntity={handleAddEntity}
            currentRoom={ALL_ROOMS_ID}
            deviceMap={deviceMap}
            addedEntityIds={[]}
            visibleEntityIds={hiddenSectionEntityIds}
            title={t('dashboard.addEntity.title')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionLabel={t('dashboard.addEntity.action')}
          />
        </Suspense>
      ) : null}
    </>
  );

  if (!customizable) {
    return content;
  }

  return (
    <SectionCustomizeShell
      isEditMode={isEditMode}
      onToggle={toggleEditMode}
      className="relative"
      actions={addHiddenEntityAction}
    >
      {content}
    </SectionCustomizeShell>
  );
}
