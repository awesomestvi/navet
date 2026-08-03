import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@navet/app/components/shared/render-profiler';
import { isAllRooms } from '@navet/app/constants/rooms';
import { useI18n } from '@navet/app/hooks';
import { dashboardToPath, pathToDashboardId } from '@navet/app/navigation/sections';
import { useErrorStore, useNavigationStore } from '@navet/app/stores';
import { appErrorSelectors } from '@navet/app/stores/selectors';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { DashboardArrivalReveal } from '../components/dashboard-arrival-reveal';
import { DashboardOverlays } from '../components/dashboard-overlays';
import { DashboardSectionRouter } from '../components/dashboard-section-router';
import { useDashboardCollectionStore } from '../dashboards/dashboard-collection-store';
import { useDashboardController } from '../hooks/use-dashboard-controller';
import { useDashboardProfileSync } from '../hooks/use-dashboard-profile-sync';

export function DashboardPage() {
  const { t } = useI18n();
  const appError = useErrorStore(appErrorSelectors.error);
  const setAppError = useErrorStore(appErrorSelectors.setError);
  const clearAppError = useErrorStore(appErrorSelectors.clearError);
  const activeCustomSidebarActionId = useNavigationStore(
    (state) => state.activeCustomSidebarActionId
  );
  const { profileLoadCompleted } = useDashboardProfileSync();
  const controller = useDashboardController();
  const pendingAssignedDashboardId = useDashboardCollectionStore(
    (state) => state.pendingAssignedDashboardId
  );
  const applyPendingAssignment = useDashboardCollectionStore(
    (state) => state.applyPendingAssignment
  );
  const syncDashboardFromLocation = useDashboardCollectionStore(
    (state) => state.syncDashboardFromLocation
  );
  const isDashboardReady =
    controller.devicesLoaded &&
    profileLoadCompleted &&
    (activeCustomSidebarActionId !== null ||
      controller.activeSection !== 'home' ||
      !isAllRooms(controller.activeRoom) ||
      controller.homeLayoutHydrated);
  const isWaitingForDashboard =
    controller.devicesLoaded && profileLoadCompleted && !isDashboardReady && !controller.connecting;

  useEffect(() => {
    if (!isWaitingForDashboard || appError) {
      return;
    }

    setAppError(t('dashboard.loadingRecovery.title'), t('dashboard.loadingRecovery.description'));
  }, [appError, isWaitingForDashboard, setAppError, t]);

  useEffect(() => {
    if (!isDashboardReady || !appError) {
      return;
    }

    if (appError.message === t('dashboard.loadingRecovery.title')) {
      clearAppError();
    }
  }, [appError, clearAppError, isDashboardReady, t]);

  useEffect(() => {
    const syncFromLocation = () => {
      syncDashboardFromLocation();
      const requestedDashboardId = pathToDashboardId(window.location.pathname);
      if (
        controller.activeSection === 'home' &&
        requestedDashboardId &&
        !useDashboardCollectionStore.getState().collection.dashboardsById[requestedDashboardId]
      ) {
        const fallbackDashboardId = useDashboardCollectionStore.getState().activeDashboardId;
        window.history.replaceState(
          window.history.state,
          '',
          `${dashboardToPath(fallbackDashboardId)}${window.location.search}${window.location.hash}`
        );
        toast.warning(t('dashboard.multiple.notFound'), {
          id: 'dashboard-not-found',
        });
      }
    };
    const handlePopState = () => syncFromLocation();
    if (profileLoadCompleted) {
      syncFromLocation();
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [controller.activeSection, profileLoadCompleted, syncDashboardFromLocation, t]);

  useEffect(() => {
    if (
      pendingAssignedDashboardId &&
      controller.activeSection === 'home' &&
      !controller.isEditMode &&
      !controller.showAddCardDialog &&
      !controller.showAddEntityDialog
    ) {
      applyPendingAssignment();
    }
  }, [
    applyPendingAssignment,
    controller.activeSection,
    controller.isEditMode,
    controller.showAddCardDialog,
    controller.showAddEntityDialog,
    pendingAssignedDashboardId,
  ]);

  if (!isDashboardReady) {
    return controller.connecting ? (
      <LoadingSpinner message={t('dashboard.page.connectingHomeAssistant')} fullScreen />
    ) : null;
  }

  return (
    <>
      <DashboardArrivalReveal
        open={
          controller.activeSection === 'home' &&
          controller.dashboardArrivalVariant !== null &&
          (controller.showImportedDashboardReveal || controller.isOnboardingClosing)
        }
        onComplete={controller.onDismissImportedDashboardReveal}
        variant={controller.dashboardArrivalVariant ?? 'import'}
      />
      <div
        aria-hidden={controller.showAddEntityDialog}
        style={
          controller.showAddEntityDialog
            ? {
                visibility: 'hidden',
                contentVisibility: 'hidden',
              }
            : undefined
        }
      >
        <RenderProfiler id="DashboardPage:SectionRouter">
          <DashboardSectionRouter controller={controller} />
        </RenderProfiler>
      </div>
      <RenderProfiler id="DashboardPage:Overlays">
        <DashboardOverlays controller={controller} />
      </RenderProfiler>
    </>
  );
}
