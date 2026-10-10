import { beforeEach, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ callWS: vi.fn() }));
vi.mock('./homeassistant-service-bridge', () => ({
  getHomeAssistantPanelHass: () => ({ callWS: session.callWS }),
  getHomeAssistantConnection: () => null,
}));

const { loaded, service } = vi.hoisted(() => ({
  loaded: vi.fn(),
  service: {
    createRoom: vi.fn(),
    renameRoom: vi.fn(),
    assignEntityToRoom: vi.fn(),
    unassignEntityFromRoom: vi.fn(),
    updateEntityRoom: vi.fn(),
    updateEntityName: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

vi.mock('./homeassistant-admin-feature.service', () => {
  loaded();
  return { homeAssistantAdminFeatureService: service };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  session.callWS = vi.fn();
});

it('defers room administration and preserves room results and all action arguments', async () => {
  const { lazyHomeAssistantAdminFeatureService: proxy } = await import(
    './homeassistant-admin-feature.service.lazy'
  );
  expect(loaded).not.toHaveBeenCalled();
  const room = { id: 'home_assistant:kitchen', name: 'Kitchen' };
  service.createRoom.mockResolvedValueOnce(room);
  service.renameRoom.mockResolvedValueOnce(room);
  expect(await proxy.createRoom('Kitchen')).toBe(room);
  expect(service.createRoom).toHaveBeenCalledWith('Kitchen');
  expect(await proxy.renameRoom(room.id, 'Kitchen')).toBe(room);
  expect(service.renameRoom).toHaveBeenCalledWith(room.id, 'Kitchen');
  await proxy.assignEntityToRoom('light.island', room.id);
  expect(service.assignEntityToRoom).toHaveBeenCalledWith('light.island', room.id);
  await proxy.unassignEntityFromRoom('light.island');
  expect(service.unassignEntityFromRoom).toHaveBeenCalledWith('light.island');
  await proxy.updateEntityRoom('light.island', null);
  expect(service.updateEntityRoom).toHaveBeenCalledWith('light.island', null);
  await proxy.updateEntityName('light.island', 'Island');
  expect(service.updateEntityName).toHaveBeenCalledWith('light.island', 'Island');
  await proxy.deleteRoom(room.id);
  expect(service.deleteRoom).toHaveBeenCalledWith(room.id);
  expect(loaded).toHaveBeenCalledTimes(1);
});

it('preserves room administration failures', async () => {
  const { lazyHomeAssistantAdminFeatureService: proxy } = await import(
    './homeassistant-admin-feature.service.lazy'
  );
  const error = new Error('Room not owned by Home Assistant');
  service.assignEntityToRoom.mockRejectedValueOnce(error);
  await expect(proxy.assignEntityToRoom('light.island', 'homey:kitchen')).rejects.toBe(error);
});

it('rejects a destructive room action if its household changes while loading', async () => {
  const { lazyHomeAssistantAdminFeatureService: proxy } = await import(
    './homeassistant-admin-feature.service.lazy'
  );
  const pending = proxy.deleteRoom('home_assistant:kitchen');
  session.callWS = vi.fn();
  await expect(pending).rejects.toThrow('Home Assistant session changed');
  expect(service.deleteRoom).not.toHaveBeenCalled();
});
