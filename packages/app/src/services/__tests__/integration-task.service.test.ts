import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { automationEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/automation';
import { lightEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/light';
import { describe, expect, it, vi } from 'vitest';

const { callServiceMock, getAutomationConfigMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn(),
  getAutomationConfigMock: vi.fn(),
}));

vi.mock('../home-assistant.service', async () => {
  const actual = await vi.importActual<typeof import('../home-assistant.service')>(
    '../home-assistant.service'
  );

  return {
    ...actual,
    homeAssistantService: {
      ...actual.homeAssistantService,
      callService: callServiceMock,
      getAutomationConfig: getAutomationConfigMock,
    },
  };
});

import { integrationTaskService } from '../integration-task.service';

describe('integration-task.service', () => {
  it('projects the Home Assistant task runtime into platform-owned task models', () => {
    const automation = automationEntityFactory({
      friendly_name: 'Arrival',
    });
    automation.entity_id = 'automation.arrival';

    const light = lightEntityFactory({
      friendly_name: 'Hall light',
    });
    light.entity_id = 'light.hall';

    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      entities: {
        [automation.entity_id]: automation,
        [light.entity_id]: light,
      },
      areas: [{ area_id: 'hall', name: 'Hallway' }],
      deviceRegistry: [{ id: 'device-1', area_id: 'hall' }],
      entityRegistry: [{ entity_id: automation.entity_id, device_id: 'device-1' }],
    });

    expect(integrationTaskService.getTaskRuntimeSnapshot()).toEqual({
      entities: {
        'automation.arrival': {
          entityId: 'automation.arrival',
          state: automation.state,
          name: 'Arrival',
          attributes: automation.attributes,
        },
        'light.hall': {
          entityId: 'light.hall',
          state: light.state,
          name: 'Hall light',
          attributes: light.attributes,
        },
      },
      rooms: [{ id: 'hall', name: 'Hallway' }],
      devices: [{ id: 'device-1', roomId: 'hall' }],
      entityReferences: [
        { entityId: 'automation.arrival', roomId: undefined, deviceId: 'device-1' },
      ],
    });
  });

  it('wraps automation config reads in the platform automation details contract', async () => {
    getAutomationConfigMock.mockResolvedValue({
      config: { description: 'Turn on the lights at sunrise.' },
    });

    await expect(
      integrationTaskService.getAutomationDetails('automation.arrival')
    ).resolves.toEqual({
      config: { description: 'Turn on the lights at sunrise.' },
    });

    expect(getAutomationConfigMock).toHaveBeenCalledWith('automation.arrival');
  });

  it('rejects non-Home Assistant automation detail requests', async () => {
    await expect(
      integrationTaskService.getAutomationDetails('homey:automation.arrival')
    ).rejects.toThrow('Automation details are not supported for the current integration yet');
  });

  it('routes automation triggers through the provider task feature service', async () => {
    await integrationTaskService.triggerAutomation('automation.arrival');

    expect(callServiceMock).toHaveBeenCalledWith(
      'automation',
      'trigger',
      {},
      {
        entity_id: 'automation.arrival',
      }
    );
  });

  it('returns an empty task runtime snapshot for providers without task support', () => {
    integrationStore.setState((current) => ({
      ...current,
      currentProviderId: 'openhab',
    }));

    expect(integrationTaskService.getTaskRuntimeSnapshot()).toEqual({
      entities: null,
      rooms: [],
      devices: [],
      entityReferences: [],
    });

    expect(typeof integrationTaskService.subscribeTaskRuntimeSnapshot(() => undefined)).toBe(
      'function'
    );
  });
});
