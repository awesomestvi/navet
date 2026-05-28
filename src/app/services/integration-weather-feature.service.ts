import type { Connection } from 'home-assistant-js-websocket';
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

function getActiveConnection(connection?: Connection | null) {
  return connection ?? homeAssistantService.getConnection();
}

export const integrationWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const connection = getActiveConnection(options?.connection);
    if (!connection) {
      return [];
    }

    const response = (await connection.sendMessagePromise({
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
