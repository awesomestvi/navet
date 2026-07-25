import { integrationStore } from '@navet/app/stores/integration-store';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAreaMock,
  updateAreaNameMock,
  updateEntityAreaMock,
  updateEntityNameMock,
  deleteAreaMock,
} = vi.hoisted(() => ({
  createAreaMock: vi.fn(),
  updateAreaNameMock: vi.fn(),
  updateEntityAreaMock: vi.fn(),
  updateEntityNameMock: vi.fn(),
  deleteAreaMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    createArea: createAreaMock,
    updateAreaName: updateAreaNameMock,
    updateEntityArea: updateEntityAreaMock,
    updateEntityName: updateEntityNameMock,
    deleteArea: deleteAreaMock,
  },
}));

import {
  executeIntegrationRoomMutationPlan,
  integrationAdminService,
} from '../integration-admin.service';

describe('integrationAdminService', () => {
  beforeEach(() => {
    integrationStore.getState().setCurrentProviderId('home_assistant');
    createAreaMock.mockReset();
    updateAreaNameMock.mockReset();
    updateEntityAreaMock.mockReset();
    updateEntityNameMock.mockReset();
    deleteAreaMock.mockReset();
  });

  it('maps created Home Assistant areas to a provider-agnostic room reference', async () => {
    createAreaMock.mockResolvedValue({
      area_id: 'kitchen',
      name: 'Kitchen',
    });

    await expect(integrationAdminService.createRoom('Kitchen')).resolves.toEqual({
      id: createProviderScopedId('home_assistant', 'kitchen'),
      name: 'Kitchen',
      providerId: 'home_assistant',
    });
  });

  it('passes entity room updates and deletes through the adapter with opaque room ids', async () => {
    updateEntityAreaMock.mockResolvedValue(undefined);
    deleteAreaMock.mockResolvedValue(undefined);

    await integrationAdminService.updateEntityRoom(
      'home_assistant:light.kitchen',
      createProviderScopedId('home_assistant', 'kitchen')
    );
    await integrationAdminService.deleteRoom(createProviderScopedId('home_assistant', 'kitchen'));

    expect(updateEntityAreaMock).toHaveBeenCalledWith('light.kitchen', 'kitchen');
    expect(deleteAreaMock).toHaveBeenCalledWith('kitchen');
  });

  it('renames rooms and explicitly unassigns entities through the provider adapter', async () => {
    updateAreaNameMock.mockResolvedValue({
      area_id: 'kitchen',
      name: 'Kitchen and dining',
    });
    updateEntityAreaMock.mockResolvedValue(undefined);

    await expect(
      integrationAdminService.renameRoom(
        createProviderScopedId('home_assistant', 'kitchen'),
        'Kitchen and dining'
      )
    ).resolves.toEqual({
      id: createProviderScopedId('home_assistant', 'kitchen'),
      name: 'Kitchen and dining',
      providerId: 'home_assistant',
    });
    await integrationAdminService.unassignEntityFromRoom('home_assistant:light.kitchen');

    expect(updateAreaNameMock).toHaveBeenCalledWith('kitchen', 'Kitchen and dining');
    expect(updateEntityAreaMock).toHaveBeenCalledWith('light.kitchen', null);
  });

  it('passes entity rename updates through the provider admin adapter', async () => {
    updateEntityNameMock.mockResolvedValue(undefined);

    await integrationAdminService.updateEntityName('home_assistant:light.kitchen', 'Kitchen');

    expect(updateEntityNameMock).toHaveBeenCalledWith('light.kitchen', 'Kitchen');
  });

  it('reports partial failures without exposing provider payloads', async () => {
    updateEntityAreaMock.mockImplementation(async (entityId: string) => {
      if (entityId === 'light.broken') {
        throw new Error('sensitive Home Assistant websocket payload');
      }
    });

    const result = await executeIntegrationRoomMutationPlan({
      providerId: 'home_assistant',
      steps: [
        {
          stepId: 'move-working',
          operation: 'assign',
          entityId: 'home_assistant:light.working',
          roomId: 'home_assistant:living-room',
        },
        {
          stepId: 'move-broken',
          operation: 'assign',
          entityId: 'home_assistant:light.broken',
          roomId: 'home_assistant:living-room',
        },
        {
          stepId: 'delete-kitchen',
          operation: 'delete',
          roomId: 'home_assistant:kitchen',
          dependsOn: ['move-working', 'move-broken'],
        },
      ],
    });

    expect(result).toEqual({
      providerId: 'home_assistant',
      status: 'partially_succeeded',
      successes: [
        {
          stepId: 'move-working',
          operation: 'assign',
        },
      ],
      failures: [
        {
          stepId: 'move-broken',
          operation: 'assign',
          reason: 'provider_rejected',
          entityId: 'home_assistant:light.broken',
          roomId: 'home_assistant:living-room',
        },
        {
          stepId: 'delete-kitchen',
          operation: 'delete',
          reason: 'dependency_failed',
          roomId: 'home_assistant:kitchen',
          failedDependencyStepIds: ['move-broken'],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('sensitive Home Assistant');
    expect(deleteAreaMock).not.toHaveBeenCalled();
  });
});
