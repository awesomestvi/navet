import type { PlatformCalendarDevice } from '@/app/platform/provider-feature-models';
import { useCalendarDevices } from './use-calendar-devices';
import { useProviderFeature } from './use-provider-feature-support';

export function useProviderCalendarDevices(): PlatformCalendarDevice[] {
  const supportsCalendar = useProviderFeature('calendar');
  const devices = useCalendarDevices();
  return supportsCalendar ? devices : [];
}

export const useProviderCalendarDevicesCollection = useProviderCalendarDevices;
