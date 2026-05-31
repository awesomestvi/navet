import { integrationStore } from '@navet/app/stores/integration-store';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAreaMock, updateEntityAreaMock, updateEntityNameMock, deleteAreaMock } = vi.hoisted(
  () => ({
    createAreaMock: vi.fn(),
    updateEntityAreaMock: vi.fn(),
    updateEntityNameMock: vi.fn(),
    deleteAreaMock: vi.fn(),
  })
);

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    createArea: createAreaMock,
    updateEntityArea: updateEntityAreaMock,
    updateEntityName: updateEntityNameMock,
    deleteArea: deleteAreaMock,
  },
}));

import { integrationAdminService } from '../integration-admin.service';

describe('integrationAdminService', () => {
  beforeEach(() => {
    integrationStore.getState().setCurrentProviderId('home_assistant');
    createAreaMock.mockReset();
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

  it('passes entity rename updates through the provider admin adapter', async () => {
    updateEntityNameMock.mockResolvedValue(undefined);

    await integrationAdminService.updateEntityName('home_assistant:light.kitchen', 'Kitchen');

    expect(updateEntityNameMock).toHaveBeenCalledWith('light.kitchen', 'Kitchen');
  });
});
