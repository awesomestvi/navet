import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsDeviceDisplaySync } from './settings-device-display-sync';

export function SettingsDeviceSettings({
  styles,
}: {
  styles: SettingsSectionController['styles'];
}) {
  const dashboardProfileMode = useSettingsStore((state) => state.dashboardProfileMode);
  const { client, clients } = useDashboardProfileRuntimeStore(
    useShallow((state) => ({ client: state.client, clients: state.clients }))
  );
  const currentClient = useMemo(
    () => client ?? getDashboardClientIdentity({ profileMode: dashboardProfileMode }),
    [client, dashboardProfileMode]
  );

  return (
    <SettingsDeviceDisplaySync clients={clients} currentClient={currentClient} styles={styles} />
  );
}
