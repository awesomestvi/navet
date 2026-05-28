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
});
