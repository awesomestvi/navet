import { beforeEach, describe, expect, it, vi } from 'vitest';
import HARegistryService from '../ha-registry.service';

describe('HARegistryService', () => {
  const sendMessagePromise = vi.fn();

  beforeEach(() => {
    sendMessagePromise.mockReset();
    sendMessagePromise.mockImplementation((message: { type: string }) => {
      if (message.type === 'config/area_registry/list') {
        return Promise.resolve([]);
      }
      if (message.type === 'config/device_registry/list') {
        return Promise.resolve([]);
      }
      if (message.type === 'config/entity_registry/list') {
        return Promise.resolve([]);
      }

      return Promise.resolve({});
    });
  });

  it('updates an entity name through the Home Assistant entity registry', async () => {
    const service = new HARegistryService(
      () =>
        ({
          sendMessagePromise,
        }) as never
    );

    await service.updateEntityName('light.kitchen', 'Kitchen island');

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'config/entity_registry/update',
      entity_id: 'light.kitchen',
      name: 'Kitchen island',
    });
  });

  it('rejects empty entity names before calling Home Assistant', async () => {
    const service = new HARegistryService(
      () =>
        ({
          sendMessagePromise,
        }) as never
    );

    await expect(service.updateEntityName('light.kitchen', '   ')).rejects.toThrow(
      'Entity name is required'
    );
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });
});
