import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callServiceMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn(),
}));

const { homeyCallServiceMock } = vi.hoisted(() => ({
  homeyCallServiceMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    callService: callServiceMock,
  },
}));

vi.mock('../homey.service', () => ({
  homeyService: {
    callService: homeyCallServiceMock,
  },
}));

describe('integration-action.service', () => {
  beforeEach(() => {
    callServiceMock.mockReset();
    homeyCallServiceMock.mockReset();
  });

  it('dispatches to Home Assistant by default', async () => {
    const { dispatchEntityAction } = await import('../integration-action.service');

    await dispatchEntityAction({
      entityId: 'light.kitchen',
      domain: 'light',
      service: 'turn_on',
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {},
      { entity_id: 'light.kitchen' }
    );
  });

  it('normalizes provider-scoped entity ids before dispatch', async () => {
    const { dispatchEntityAction } = await import('../integration-action.service');

    await dispatchEntityAction({
      entityId: 'home_assistant:scene.good_morning',
      domain: 'scene',
      service: 'turn_on',
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'scene',
      'turn_on',
      {},
      { entity_id: 'scene.good_morning' }
    );
  });

  it('routes Homey actions through the Homey adapter', async () => {
    const { dispatchEntityAction } = await import('../integration-action.service');

    await dispatchEntityAction({
      providerId: 'homey',
      entityId: 'homey:device-1',
      domain: 'switch',
      service: 'turn_on',
    });

    expect(homeyCallServiceMock).toHaveBeenCalledWith(
      'switch',
      'turn_on',
      {},
      {
        entity_id: 'device-1',
      }
    );
  });

  it('dispatches canonical provider actions through the provider contract', async () => {
    const { dispatchAction } = await import('../integration-action.service');

    await dispatchAction({
      targetId: 'home_assistant:light.kitchen',
      providerId: 'home_assistant',
      actionId: 'brightness',
      payload: { value: 42 },
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_on',
      { brightness_pct: 42 },
      { entity_id: 'light.kitchen' }
    );
  });
});
