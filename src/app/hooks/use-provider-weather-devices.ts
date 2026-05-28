import type { PlatformWeatherDevice } from '@/app/platform/provider-feature-models';
import { useHomeAssistantWeatherDevices } from './use-home-assistant-weather-devices';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_WEATHER_DEVICES: PlatformWeatherDevice[] = [];

export function useProviderWeatherDevices(): PlatformWeatherDevice[] {
  const supportsWeather = useProviderFeature('weather');
  const devices = useHomeAssistantWeatherDevices();
  return supportsWeather ? devices : EMPTY_WEATHER_DEVICES;
}

export const useProviderWeatherDevicesCollection = useProviderWeatherDevices;
