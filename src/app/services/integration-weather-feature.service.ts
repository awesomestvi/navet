import type { ProviderWeatherFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

type WeatherForecastEntry = Record<string, unknown>;

type WeatherForecastServicePayload = {
  response?: Record<
    string,
    {
      forecast?: WeatherForecastEntry[];
    }
  >;
};

type WeatherForecastServiceEnvelope = WeatherForecastServicePayload & {
  result?: WeatherForecastServicePayload;
};

function getActiveMessageClient(
  messageClient?: { sendMessagePromise<T>(message: unknown): Promise<T> } | null
) {
  return messageClient ?? homeAssistantService.getConnection();
}

function requireHomeAssistantWeatherProvider(entityId: string) {
  const providerScope = parseProviderScopedId(entityId);
  if (providerScope && providerScope.providerId !== 'home_assistant') {
    throw new Error('Weather forecasts are not supported for the current integration yet');
  }

  return providerScope?.nativeId ?? entityId;
}

export const integrationWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const nativeEntityId = requireHomeAssistantWeatherProvider(entityId);
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient) {
      return [];
    }

    const response = (await messageClient.sendMessagePromise({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: nativeEntityId },
      service_data: { type },
      return_response: true,
    })) as WeatherForecastServiceEnvelope;

    return (
      response.response?.[nativeEntityId]?.forecast ??
      response.result?.response?.[nativeEntityId]?.forecast ??
      []
    );
  },
};
