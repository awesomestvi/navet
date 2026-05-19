import { useEffect } from 'react';
import { LoadingSpinner } from '@/app/components/primitives/loading-spinner';
import { isAllRooms } from '@/app/constants/rooms';
import { useI18n } from '@/app/hooks';
import { useErrorStore } from '@/app/stores';
import { appErrorSelectors } from '@/app/stores/selectors';
import { DashboardArrivalReveal } from '../components/dashboard-arrival-reveal';
import { DashboardOverlays } from '../components/dashboard-overlays';
import { DashboardSectionRouter } from '../components/dashboard-section-router';
import { useDashboardController } from '../hooks/use-dashboard-controller';
import { useDashboardProfileSync } from '../hooks/use-dashboard-profile-sync';

export function DashboardPage() {
  const { t } = useI18n();
  const appError = useErrorStore(appErrorSelectors.error);
  const setAppError = useErrorStore(appErrorSelectors.setError);
  useDashboardProfileSync();
  const controller = useDashboardController();
  const isDashboardReady =
    controller.devicesLoaded &&
    (controller.activeSection !== 'home' ||
      !isAllRooms(controller.activeRoom) ||
      controller.homeLayoutHydrated);
  const isWaitingForDashboard = !isDashboardReady && !controller.connecting;

  useEffect(() => {
    if (!isWaitingForDashboard || appError) {
      return;
    }

    setAppError(t('dashboard.loadingRecovery.title'), t('dashboard.loadingRecovery.description'));
  }, [appError, isWaitingForDashboard, setAppError, t]);

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
        <DashboardSectionRouter controller={controller} />
      </div>
      <DashboardOverlays controller={controller} />
    </>
  );
}
