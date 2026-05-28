import type { PlatformCalendarDevice } from '@/app/platform/provider-feature-models';
import { useHomeAssistantCalendarDevices } from './use-home-assistant-calendar-devices';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_CALENDAR_DEVICES: PlatformCalendarDevice[] = [];

export function useProviderCalendarDevices(): PlatformCalendarDevice[] {
  const supportsCalendar = useProviderFeature('calendar');
  const devices = useHomeAssistantCalendarDevices();
  return supportsCalendar ? devices : EMPTY_CALENDAR_DEVICES;
}

export const useProviderCalendarDevicesCollection = useProviderCalendarDevices;
