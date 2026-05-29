import type { ProviderWeatherFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

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

export const homeAssistantWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient) {
      return [];
    }

    const response = (await messageClient.sendMessagePromise({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: entityId },
      service_data: { type },
      return_response: true,
    })) as WeatherForecastServiceEnvelope;

    return (
      response.response?.[entityId]?.forecast ??
      response.result?.response?.[entityId]?.forecast ??
      []
    );
  },
};
