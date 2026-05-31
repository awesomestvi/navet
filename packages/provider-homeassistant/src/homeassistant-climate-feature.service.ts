import type {
  ProviderClimateFeatureService,
  ProviderClimateTemperatureUpdate,
} from '@navet/core/provider-feature-services';
import { callHomeAssistantService } from './homeassistant-service-bridge';

function toServiceData(update: ProviderClimateTemperatureUpdate): Record<string, number> {
  if (typeof update.temperature === 'number') {
    return { temperature: update.temperature };
  }

  const serviceData: Record<string, number> = {};

  if (typeof update.targetTemperatureLow === 'number') {
    serviceData.target_temp_low = update.targetTemperatureLow;
  }

  if (typeof update.targetTemperatureHigh === 'number') {
    serviceData.target_temp_high = update.targetTemperatureHigh;
  }

  return serviceData;
}

export const homeAssistantClimateFeatureService: ProviderClimateFeatureService = {
  setTargetTemperature: async (entityId, update) =>
    await callHomeAssistantService(
      update.serviceDomain ?? (entityId.startsWith('water_heater.') ? 'water_heater' : 'climate'),
      'set_temperature',
      toServiceData(update),
      { entityId: entityId }
    ),
};
