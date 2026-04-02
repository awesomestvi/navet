import { Lightbulb, Sparkles } from 'lucide-react';
import { lazy, type ReactNode, Suspense } from 'react';
import { RoomNav } from '@/app/components/layout/room-nav';
import { SectionCustomizeShell } from '@/app/components/layout/section-customize-shell';
import { DashboardEmptyState } from '@/app/components/patterns/dashboard-empty-state';
import { LoadingSpinner } from '@/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@/app/components/shared/render-profiler';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import { AllViewGrid } from '../all-view-grid';
import { DeviceGrid } from '../device-grid';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { DashboardLayout } from '../shell';
import { ENERGY_WIDGET_ROOM } from '../stores/custom-cards-store';
import { HomeDashboardOverview } from './home-dashboard-overview';
import { RoomOverviewPanel } from './room-overview-panel';

const lazySections = () => import('@/app/components/layout/sections');

const SecuritySection = lazy(() => lazySections().then((m) => ({ default: m.SecuritySection })));
const TasksSection = lazy(() => lazySections().then((m) => ({ default: m.TasksSection })));
const LocksSection = lazy(() => lazySections().then((m) => ({ default: m.LocksSection })));
const MediaSection = lazy(() => lazySections().then((m) => ({ default: m.MediaSection })));
const EnergySection = lazy(async () => {
  const module = await import('@/app/features/energy');
  return { default: module.EnergySection };
});
const SettingsSection = lazy(async () => {
  const module = await import('@/app/features/settings');
  return { default: module.SettingsSection };
});

interface DashboardSectionRouterProps {
  controller: DashboardController;
}

export function DashboardSectionRouter({ controller }: DashboardSectionRouterProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const {
    activeRoom,
    activeSection,
    addableEntityIds,
    cardOrders,
    cardSizes,
    changeRoom,
    customCards,
    deviceMap,
    handleDeleteCard,
    handleRemoveEntity,
    handleUpdateCard,
    hiddenEntityIds,
    isEditMode,
    lightDeviceMap,
    lightRooms,
    onOpenAddEntityDialog,
    onToggleEditMode,
    orderedCardIds,
    rooms,
    updateCardSize,
  } = controller;
  const sectionStackProps = {
    className: 'flex flex-col gap-2 md:gap-6',
  };
  const energyCustomCards = controller.allCustomCards.filter(
    (card) => card.room === ENERGY_WIDGET_ROOM
  );
  const energyOrderedCardIds =
    controller.cardOrders[ENERGY_WIDGET_ROOM]?.filter((id) =>
      energyCustomCards.some((card) => card.id === id)
    ) ?? energyCustomCards.map((card) => card.id);

  let sectionContent: ReactNode;

  if (activeSection === 'security') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <SecuritySection />
      </Suspense>
    );
  } else if (activeSection === 'energy') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <RenderProfiler id="EnergySection">
          <div className="space-y-6">
            <EnergySection />

            {isEditMode || energyCustomCards.length > 0 ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
                    >
                      {t('energy.band.eyebrow')}
                    </div>
                    <h2
                      className={`mt-2 text-lg font-semibold tracking-tight md:text-xl ${surface.textPrimary}`}
                    >
                      {t('energy.customCards.title')}
                    </h2>
                    <p className={`mt-1.5 max-w-2xl text-sm ${surface.textSecondary}`}>
                      {t('energy.customCards.description')}
                    </p>
                  </div>

                  {isEditMode ? (
                    <button
                      type="button"
                      onClick={() => controller.onOpenAddCardDialog()}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.panelMuted} ${surface.hoverBg} ${surface.textPrimary}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {t('dashboard.addCard.action')}
                    </button>
                  ) : null}
                </div>

                {energyCustomCards.length > 0 ? (
                  <DeviceGrid
                    orderedCardIds={energyOrderedCardIds}
                    deviceMap={new Map<string, DeviceWithType>()}
                    isEditMode={isEditMode}
                    cardSizes={cardSizes}
                    updateCardSize={updateCardSize}
                    customCards={energyCustomCards}
                    onDeleteCard={handleDeleteCard}
                    onUpdateCard={handleUpdateCard}
                  />
                ) : isEditMode ? (
                  <div className="flex h-full items-center justify-center p-6">
                    <DashboardEmptyState
                      icon={Sparkles}
                      title={t('energy.customCards.emptyTitle')}
                      description={t('energy.customCards.emptyDescription')}
                      actionLabel={t('dashboard.addCard.action')}
                      onAction={() => controller.onOpenAddCardDialog()}
                      className="w-full max-w-md"
                    />
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </RenderProfiler>
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
      <div {...sectionStackProps} className="relative flex flex-col gap-2 md:gap-6">
        {lightDeviceMap.size > 0 ? (
          <SectionCustomizeShell
            isEditMode={isEditMode}
            onToggle={onToggleEditMode ?? (() => {})}
            className="relative"
          >
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
          </SectionCustomizeShell>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <DashboardEmptyState
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
              className="w-full max-w-md"
            />
          </div>
        )}
      </div>
    );
  } else if (activeSection === 'media') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <MediaSection />
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
          rooms={rooms}
          activeRoom={activeRoom}
          onRoomChange={changeRoom}
          allViewGrouping={activeRoom === 'All' ? undefined : controller.allViewGrouping}
          isEditMode={isEditMode}
          onAllViewGroupingChange={
            activeRoom === 'All' ? undefined : controller.onSetAllViewGrouping
          }
          onToggleEditMode={onToggleEditMode}
          onAddEntity={
            activeRoom === 'All' || addableEntityIds.length === 0
              ? undefined
              : onOpenAddEntityDialog
          }
          addEntityLabel={t('dashboard.addEntity.title')}
        />

        {activeRoom === 'All' ? (
          <RenderProfiler id="HomeDashboardOverview">
            <HomeDashboardOverview
              deviceMap={deviceMap}
              cardSizes={cardSizes}
              updateCardSize={updateCardSize}
              isEditMode={isEditMode}
              hiddenEntityCount={hiddenEntityIds.length}
              allCustomCards={controller.allCustomCards}
              homeLayout={controller.homeLayout}
              removeHomeCard={controller.removeHomeCard}
              moveHomeCard={controller.moveHomeCard}
              setHomeLayoutMode={controller.setHomeLayoutMode}
              addHomeSection={controller.addHomeSection}
              addHomeColumnSection={controller.addHomeColumnSection}
              addHomeSectionBelow={controller.addHomeSectionBelow}
              moveHomeSection={controller.moveHomeSection}
              moveHomeColumn={controller.moveHomeColumn}
              renameHomeSection={controller.renameHomeSection}
              removeHomeSection={controller.removeHomeSection}
              resizeHomeSection={controller.resizeHomeSection}
              onOpenAddCardDialog={controller.onOpenAddCardDialog}
              onUpdateCard={handleUpdateCard}
              onToggleEditMode={controller.onToggleEditMode}
            />
          </RenderProfiler>
        ) : (
          <RenderProfiler id={`DeviceGrid:${activeRoom}`}>
            <div className="space-y-6">
              <RoomOverviewPanel
                room={activeRoom}
                orderedCardIds={orderedCardIds}
                deviceMap={deviceMap}
              />
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
            </div>
          </RenderProfiler>
        )}
      </div>
    );
  }

  return <DashboardLayout>{sectionContent}</DashboardLayout>;
}
