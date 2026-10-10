import type { NavetTodoList } from '@navet/core/todo-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addIntegrationTodoItem,
  getIntegrationTodoItems,
  getIntegrationTodoLists,
  removeIntegrationTodoItem,
  subscribeIntegrationTodoItems,
  subscribeIntegrationTodoLists,
  updateIntegrationTodoItem,
} from '../integration-todo.service';

const providers = vi.hoisted(() => ({
  services: new Map<string, Record<string, ReturnType<typeof vi.fn>>>(),
}));
vi.mock('../integration-registry.service', () => ({
  getIntegrationProviderAdapter: (providerId: string) => ({
    todoListFeatureService: providers.services.get(providerId),
  }),
}));

const list: NavetTodoList = {
  id: 'homey:groceries',
  externalId: 'groceries',
  providerId: 'homey',
  name: 'Groceries',
  available: true,
  capabilities: {
    add: true,
    update: true,
    remove: true,
    description: false,
    dueDate: false,
    dueDateTime: false,
  },
};
function makeService() {
  return Object.fromEntries(
    [
      'getLists',
      'getItems',
      'subscribeLists',
      'subscribeItems',
      'addItem',
      'updateItem',
      'removeItem',
    ].map((method) => [method, vi.fn(async () => (method.startsWith('subscribe') ? vi.fn() : []))])
  );
}
beforeEach(() => {
  providers.services.clear();
  providers.services.set('homey', makeService());
  providers.services.set('home_assistant', makeService());
});

describe('shared list provider routing', () => {
  it('discovers only explicitly selected providers and deduplicates selection', async () => {
    providers.services.get('homey')?.getLists.mockResolvedValue([list]);
    expect(await getIntegrationTodoLists(['homey', 'openhab', 'homey'])).toEqual([list]);
    expect(providers.services.get('homey')?.getLists).toHaveBeenCalledTimes(1);
    expect(providers.services.get('home_assistant')?.getLists).not.toHaveBeenCalled();
  });

  it('routes reads, subscriptions and writes through each list owner', async () => {
    await getIntegrationTodoItems(list);
    const listener = vi.fn();
    await subscribeIntegrationTodoItems(list, listener);
    await addIntegrationTodoItem(list, { summary: 'Milk' });
    await updateIntegrationTodoItem(list, 'item-uid', { completed: true });
    await removeIntegrationTodoItem(list, 'item-uid');
    const service = providers.services.get('homey');
    expect(service?.getItems).toHaveBeenCalledWith('groceries');
    expect(service?.subscribeItems).toHaveBeenCalledWith('groceries', listener, undefined);
    expect(service?.addItem).toHaveBeenCalledWith('groceries', { summary: 'Milk' });
    expect(service?.updateItem).toHaveBeenCalledWith('groceries', 'item-uid', { completed: true });
    expect(service?.removeItem).toHaveBeenCalledWith('groceries', 'item-uid');
    expect(providers.services.get('home_assistant')?.addItem).not.toHaveBeenCalled();
  });

  it('merges live descriptors from selected provider services and releases them', async () => {
    const releases = [vi.fn(), vi.fn()];
    const callbacks: ((lists: NavetTodoList[]) => void)[] = [];
    for (const [index, provider] of ['homey', 'home_assistant'].entries())
      providers.services.get(provider)?.subscribeLists.mockImplementation(async (callback) => {
        callbacks.push(callback);
        return releases[index];
      });
    const listener = vi.fn();
    const unsubscribe = await subscribeIntegrationTodoLists(['homey', 'home_assistant'], listener);
    callbacks[0]([list]);
    callbacks[1]([
      {
        ...list,
        providerId: 'home_assistant',
        id: 'home_assistant:todo.shopping_list',
        externalId: 'todo.shopping_list',
      },
    ]);
    expect(listener.mock.lastCall?.[0]).toHaveLength(2);
    unsubscribe();
    callbacks[0]([]);
    expect(releases.every((release) => release.mock.calls.length === 1)).toBe(true);
    expect(listener.mock.lastCall?.[0]).toHaveLength(2);
  });

  it('rejects unsupported owners instead of using another provider', () => {
    expect(() => getIntegrationTodoItems({ ...list, providerId: 'openhab' })).toThrow(
      'does not support'
    );
  });
});
