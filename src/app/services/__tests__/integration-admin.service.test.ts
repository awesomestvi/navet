import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProviderScopedId } from '@/app/utils/provider-ids';

const { createAreaMock, updateEntityAreaMock, deleteAreaMock } = vi.hoisted(() => ({
  createAreaMock: vi.fn(),
  updateEntityAreaMock: vi.fn(),
  deleteAreaMock: vi.fn(),
}));

vi.mock('@/app/infrastructure/home-assistant/auth/auth-session-manager', () => ({
  authSessionManager: {
    getSnapshot: () => ({
      providerId: 'home_assistant',
    }),
  },
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    createArea: createAreaMock,
    updateEntityArea: updateEntityAreaMock,
    deleteArea: deleteAreaMock,
  },
}));

import { integrationAdminService } from '../integration-admin.service';

describe('integrationAdminService', () => {
  beforeEach(() => {
    createAreaMock.mockReset();
    updateEntityAreaMock.mockReset();
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
});
