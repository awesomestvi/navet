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

  it('accepts an injected message client through the provider contract options', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      response: {
        'weather.home': {
          forecast: [{ condition: 'rainy' }],
        },
      },
    });

    await expect(
      integrationWeatherFeatureService.getForecast('weather.home', 'daily', {
        messageClient: { sendMessagePromise },
      })
    ).resolves.toEqual([{ condition: 'rainy' }]);
    expect(getConnectionMock).not.toHaveBeenCalled();
  });

  it('rejects non-Home Assistant weather entities', async () => {
    await expect(
      integrationWeatherFeatureService.getForecast('homey:weather.home', 'daily')
    ).rejects.toThrow('Weather forecasts are not supported for the current integration yet');
  });
});
