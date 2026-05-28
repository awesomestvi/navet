import type { PlatformCalendarDevice } from '@/app/platform/provider-feature-models';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHomeAssistantCalendarDevices } from './use-home-assistant-calendar-devices';
import { useIntegrationStore } from './use-integration-store';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_CALENDAR_DEVICES: PlatformCalendarDevice[] = [];

export function useProviderCalendarDevices(): PlatformCalendarDevice[] {
  const supportsCalendar = useProviderFeature('calendar');
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const devices = useHomeAssistantCalendarDevices(
    supportsCalendar && currentProviderId === 'home_assistant'
  );
  return supportsCalendar ? devices : EMPTY_CALENDAR_DEVICES;
}

export const useProviderCalendarDevicesCollection = useProviderCalendarDevices;
