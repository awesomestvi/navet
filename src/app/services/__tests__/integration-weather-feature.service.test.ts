import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConnectionMock } = vi.hoisted(() => ({
  getConnectionMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    getConnection: getConnectionMock,
  },
}));

import { integrationWeatherFeatureService } from '../integration-weather-feature.service';

describe('integrationWeatherFeatureService', () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
  });

  it('loads weather forecasts through the HA adapter contract', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      response: {
        'weather.home': {
          forecast: [{ condition: 'sunny' }],
        },
      },
    });
    getConnectionMock.mockReturnValue({ sendMessagePromise });

    await expect(
      integrationWeatherFeatureService.getForecast('weather.home', 'daily')
    ).resolves.toEqual([{ condition: 'sunny' }]);
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: 'weather.home' },
      service_data: { type: 'daily' },
      return_response: true,
    });
  });
});
