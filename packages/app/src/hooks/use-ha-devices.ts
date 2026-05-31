import { useDevices, useProviderDevices } from './use-devices';
import { useProviderCalendarDevices } from './use-provider-calendar-devices';
import { useProviderWeatherDevices } from './use-provider-weather-devices';

export const useHomeAssistantCalendarDevices = (enabled = true) => {
  const devices = useProviderCalendarDevices('home_assistant');
  return enabled ? devices : [];
};

export const useHomeAssistantWeatherDevices = (enabled = true) => {
  const devices = useProviderWeatherDevices('home_assistant');
  return enabled ? devices : [];
};

/**
 * Legacy Home Assistant compatibility hook.
 * Shared app code should prefer provider-neutral hooks from `use-devices.ts`.
 */
export const useHADevices = () => {
  const devices = useProviderDevices('home_assistant');
  const calendars = useHomeAssistantCalendarDevices();
  const weather = useHomeAssistantWeatherDevices();

  return {
    ...devices,
    calendars,
    weather,
  };
};

export { useDevices };
