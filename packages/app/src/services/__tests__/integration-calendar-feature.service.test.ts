import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConnectionMock } = vi.hoisted(() => ({
  getConnectionMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    getConnection: getConnectionMock,
  },
}));

import { integrationCalendarFeatureService } from '../integration-calendar-feature.service';

describe('integrationCalendarFeatureService', () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
  });

  it('loads calendar events through the HA adapter contract', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      response: {
        'calendar.family': {
          events: [{ summary: 'School pickup' }],
        },
      },
    });
    getConnectionMock.mockReturnValue({ sendMessagePromise });

    await expect(integrationCalendarFeatureService.getEvents('calendar.family')).resolves.toEqual([
      { summary: 'School pickup' },
    ]);
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'call_service',
        domain: 'calendar',
        service: 'get_events',
        target: { entity_id: 'calendar.family' },
        return_response: true,
      })
    );
  });

  it('accepts an injected message client through the provider contract options', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      response: {
        'calendar.family': {
          events: [{ summary: 'Dentist' }],
        },
      },
    });

    await expect(
      integrationCalendarFeatureService.getEvents('calendar.family', {
        messageClient: { sendMessagePromise },
      })
    ).resolves.toEqual([{ summary: 'Dentist' }]);
    expect(getConnectionMock).not.toHaveBeenCalled();
  });

  it('rejects non-Home Assistant calendar entities', async () => {
    await expect(
      integrationCalendarFeatureService.getEvents('homey:calendar.family')
    ).rejects.toThrow('Calendar events are not supported for the current integration yet');
  });
});
