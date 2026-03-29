import { LoadingSpinner } from '@/app/components/shared/loading-spinner';
import { useI18n } from '@/app/hooks';
import { DashboardArrivalReveal } from '../components/dashboard-arrival-reveal';
import { DashboardOverlays } from '../components/dashboard-overlays';
import { DashboardSectionRouter } from '../components/dashboard-section-router';
import { useDashboardController } from '../hooks/use-dashboard-controller';

export function DashboardPage() {
  const { t } = useI18n();
  const controller = useDashboardController();
  const isDashboardReady =
    controller.devicesLoaded &&
    (controller.activeSection !== 'home' ||
      controller.activeRoom !== 'All' ||
      controller.homeLayoutHydrated);

  if (!isDashboardReady) {
    const message = controller.connecting
      ? t('dashboard.page.connectingHomeAssistant')
      : t('dashboard.page.loadingDevices');
    return <LoadingSpinner message={message} fullScreen />;
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
