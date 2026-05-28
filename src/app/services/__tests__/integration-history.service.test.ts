import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConnectionMock } = vi.hoisted(() => ({
  getConnectionMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    getConnection: getConnectionMock,
  },
}));

import { integrationHistoryService } from '../integration-history.service';

describe('integrationHistoryService', () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
  });

  it('exposes the active Home Assistant message client through the provider history contract', () => {
    const sendMessagePromise = vi.fn();
    getConnectionMock.mockReturnValue({ sendMessagePromise });

    expect(integrationHistoryService.getMessageClient()).toEqual({
      sendMessagePromise,
    });
  });
});
