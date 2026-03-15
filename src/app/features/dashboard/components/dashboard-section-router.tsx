import { closestCenter, DndContext } from '@dnd-kit/core';
import { Lightbulb } from 'lucide-react';
import { lazy, type ReactNode, Suspense } from 'react';
import { RoomNav } from '@/app/components/layout/room-nav';
import { EmptyState } from '@/app/components/shared/empty-state';
import { LoadingSpinner } from '@/app/components/shared/loading-spinner';
import { RenderProfiler } from '@/app/components/shared/render-profiler';
import { useI18n } from '@/app/hooks';
import { AllViewGrid } from '../all-view-grid';
import { DeviceGrid } from '../device-grid';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { DashboardLayout } from '../shell';

const lazySections = () => import('@/app/components/layout/sections');

const SecuritySection = lazy(() => lazySections().then((m) => ({ default: m.SecuritySection })));
const TasksSection = lazy(() => lazySections().then((m) => ({ default: m.TasksSection })));
const LocksSection = lazy(() => lazySections().then((m) => ({ default: m.LocksSection })));
const MediaSection = lazy(() => lazySections().then((m) => ({ default: m.MediaSection })));
const MockEntitiesSection = lazy(() =>
  lazySections().then((m) => ({ default: m.MockEntitiesSection }))
);
const SettingsSection = lazy(async () => {
  const module = await import('@/app/features/settings');
  return { default: module.SettingsSection };
});

interface DashboardSectionRouterProps {
  controller: DashboardController;
}

export function DashboardSectionRouter({ controller }: DashboardSectionRouterProps) {
  const { t } = useI18n();
  const {
    activeRoom,
    activeSection,
    addableEntityIds,
    allViewGrouping,
    cardOrders,
    cardSizes,
    changeRoom,
    customCards,
    deviceMap,
    handleDeleteCard,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleRemoveEntity,
    handleUpdateCard,
    hiddenEntityIds,
    isEditMode,
    lightDeviceMap,
    lightRooms,
    onMoveRoom,
    onSetAllViewGrouping,
    onOpenAddCardDialog,
    onOpenAddEntityDialog,
    onToggleEditMode,
    orderedCardIds,
    roomOrder,
    sensors,
    showAddEntityDialog,
    updateCardSize,
  } = controller;
  const sectionStackProps = {
    className: 'flex flex-col gap-2 md:gap-6',
  };

  let sectionContent: ReactNode;

  if (activeSection === 'security') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <SecuritySection />
      </Suspense>
    );
  } else if (activeSection === 'tasks') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <TasksSection />
      </Suspense>
    );
  } else if (activeSection === 'locks') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <LocksSection />
      </Suspense>
    );
  } else if (activeSection === 'lights') {
    sectionContent = (
      <div {...sectionStackProps}>
        {lightDeviceMap.size > 0 ? (
          <RenderProfiler id="LightsSection">
            <AllViewGrid
              deviceMap={lightDeviceMap}
              rooms={lightRooms}
              cardOrders={cardOrders}
              isEditMode={isEditMode}
              cardSizes={cardSizes}
              grouping="custom"
              updateCardSize={updateCardSize}
            />
          </RenderProfiler>
        ) : (
          <EmptyState
            icon={Lightbulb}
            title={t('dashboard.shell.noLightsTitle')}
            description={
              hiddenEntityIds.length > 0
                ? t('dashboard.shell.noLightsHidden')
                : t('dashboard.shell.noLightsEmpty')
            }
            actionIcon={Lightbulb}
            actionLabel={hiddenEntityIds.length > 0 ? t('dashboard.addEntity.title') : undefined}
            onAction={hiddenEntityIds.length > 0 ? onOpenAddEntityDialog : undefined}
          />
        )}
      </div>
    );
  } else if (activeSection === 'media') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <MediaSection />
      </Suspense>
    );
  } else if (activeSection === 'mock') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <MockEntitiesSection />
      </Suspense>
    );
  } else if (activeSection === 'settings') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner message={t('dashboard.shell.loadingSettings')} />}>
        <RenderProfiler id="SettingsSection">
          <SettingsSection />
        </RenderProfiler>
      </Suspense>
    );
  } else {
    sectionContent = (
      <div {...sectionStackProps}>
        <RoomNav
          rooms={roomOrder}
          activeRoom={activeRoom}
          onRoomChange={changeRoom}
          allViewGrouping={allViewGrouping}
          isEditMode={isEditMode}
          onAllViewGroupingChange={onSetAllViewGrouping}
          onToggleEditMode={onToggleEditMode}
          onMoveRoom={onMoveRoom}
          onAddCard={onOpenAddCardDialog}
          onAddEntity={addableEntityIds.length > 0 ? onOpenAddEntityDialog : undefined}
          addEntityLabel={t('dashboard.addEntity.title')}
        />

        {activeRoom === 'All' ? (
          <RenderProfiler id="AllViewGrid">
            <AllViewGrid
              deviceMap={deviceMap}
              rooms={roomOrder}
              cardOrders={cardOrders}
              isEditMode={isEditMode}
              cardSizes={cardSizes}
              grouping={allViewGrouping}
              updateCardSize={updateCardSize}
              customCards={customCards}
              onDeleteCard={handleDeleteCard}
              onUpdateCard={handleUpdateCard}
              onRemoveEntity={handleRemoveEntity}
              allowEntityRemoval
              usesHideAction
            />
          </RenderProfiler>
        ) : (
          <RenderProfiler id={`DeviceGrid:${activeRoom}`}>
            <DeviceGrid
              orderedCardIds={orderedCardIds}
              deviceMap={deviceMap}
              isEditMode={isEditMode}
              cardSizes={cardSizes}
              updateCardSize={updateCardSize}
              customCards={customCards}
              onDeleteCard={handleDeleteCard}
              onUpdateCard={handleUpdateCard}
              onRemoveEntity={handleRemoveEntity}
              allowEntityRemoval
              usesHideAction
            />
          </RenderProfiler>
        )}

        {deviceMap.size === 0 && customCards.length === 0 && activeRoom === 'All' && (
          <EmptyState
            icon={Lightbulb}
            title={t('dashboard.shell.noVisibleEntitiesTitle')}
            description={t('dashboard.shell.noVisibleEntitiesDescription')}
            actionIcon={Lightbulb}
            actionLabel={addableEntityIds.length > 0 ? t('dashboard.addEntity.title') : undefined}
            onAction={addableEntityIds.length > 0 ? onOpenAddEntityDialog : undefined}
          />
        )}
      </div>
    );
  }

  const dashboardContent = <DashboardLayout>{sectionContent}</DashboardLayout>;

  if (activeSection === 'settings') {
    return dashboardContent;
  }

  if (
    activeSection === 'security' ||
    activeSection === 'tasks' ||
    activeSection === 'locks' ||
    activeSection === 'lights' ||
    activeSection === 'media' ||
    activeSection === 'mock'
  ) {
    return dashboardContent;
  }

  if (!isEditMode || showAddEntityDialog) {
    return dashboardContent;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {dashboardContent}
    </DndContext>
  );
}
