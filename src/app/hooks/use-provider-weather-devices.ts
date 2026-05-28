import type { PlatformWeatherDevice } from '@/app/platform/provider-feature-models';
import { useProviderFeature } from './use-provider-feature-support';
import { useWeatherDevices } from './use-weather-devices';

export function useProviderWeatherDevices(): PlatformWeatherDevice[] {
  const supportsWeather = useProviderFeature('weather');
  const devices = useWeatherDevices();
  return supportsWeather ? devices : [];
}

export const useProviderWeatherDevicesCollection = useProviderWeatherDevices;
