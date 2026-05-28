import type { PlatformWeatherDevice } from '@/app/platform/provider-feature-models';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHomeAssistantWeatherDevices } from './use-home-assistant-weather-devices';
import { useIntegrationStore } from './use-integration-store';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_WEATHER_DEVICES: PlatformWeatherDevice[] = [];

export function useProviderWeatherDevices(): PlatformWeatherDevice[] {
  const supportsWeather = useProviderFeature('weather');
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const devices = useHomeAssistantWeatherDevices(
    supportsWeather && currentProviderId === 'home_assistant'
  );
  return supportsWeather ? devices : EMPTY_WEATHER_DEVICES;
}

export const useProviderWeatherDevicesCollection = useProviderWeatherDevices;
