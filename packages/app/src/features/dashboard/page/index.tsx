import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@navet/app/components/shared/render-profiler';
import { isAllRooms } from '@navet/app/constants/rooms';
import { useI18n } from '@navet/app/hooks';
import { useErrorStore, useNavigationStore } from '@navet/app/stores';
import { appErrorSelectors } from '@navet/app/stores/selectors';
import { useEffect } from 'react';
import { DashboardArrivalReveal } from '../components/dashboard-arrival-reveal';
import { DashboardOverlays } from '../components/dashboard-overlays';
import { DashboardSectionRouter } from '../components/dashboard-section-router';
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
  const isDashboardReady =
    controller.devicesLoaded &&
    profileLoadCompleted &&
    (activeCustomSidebarActionId !== null ||
      controller.activeSection !== 'home' ||
      !isAllRooms(controller.activeRoom) ||
      controller.homeLayoutHydrated);
  const isWaitingForDashboard =
    controller.devicesLoaded &&
    profileLoadCompleted &&
    !isDashboardReady &&
    !controller.connecting;

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
