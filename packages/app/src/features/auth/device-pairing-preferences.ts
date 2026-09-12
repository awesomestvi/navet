import type { DevicePairingPreferences } from '@navet/app/auth/device-authorization';
import { useSettingsStore } from '@navet/app/stores/settings-store';

export function getCurrentDevicePairingPreferences(): DevicePairingPreferences {
  const { language, use24HourTime, temperatureUnit } = useSettingsStore.getState();
  return { language, use24HourTime, temperatureUnit };
}

export function applyDevicePairingPreferences(preferences: DevicePairingPreferences | null) {
  if (preferences) {
    useSettingsStore.getState().updateSettings(preferences);
  }
}
