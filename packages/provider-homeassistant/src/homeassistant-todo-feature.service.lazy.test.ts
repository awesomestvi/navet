import { beforeEach, expect, it, vi } from 'vitest';

const { loaded, service, unsubscribe } = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  return {
    loaded: vi.fn(),
    unsubscribe,
    service: {
      getLists: vi.fn(),
      subscribeLists: vi.fn(),
      getItems: vi.fn(),
      subscribeItems: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
    },
  };
});

vi.mock('./homeassistant-todo-feature.service', () => {
  loaded();
  return { homeAssistantTodoListFeatureService: service };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  service.getLists.mockResolvedValue([]);
  service.getItems.mockResolvedValue([]);
  service.subscribeLists.mockResolvedValue(unsubscribe);
  service.subscribeItems.mockResolvedValue(unsubscribe);
});

it('defers list transport loading and preserves subscriptions and mutation arguments', async () => {
  const { lazyHomeAssistantTodoListFeatureService: proxy } = await import(
    './homeassistant-todo-feature.service.lazy'
  );
  expect(loaded).not.toHaveBeenCalled();
  expect(await proxy.getLists()).toEqual([]);
  expect(loaded).toHaveBeenCalledTimes(1);
  const listener = vi.fn();
  const onError = vi.fn();
  const dispose = await proxy.subscribeLists(listener, onError);
  expect(service.subscribeLists).toHaveBeenCalledWith(listener, onError);
  dispose();
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(await proxy.getItems('todo.shopping')).toEqual([]);
  expect(service.getItems).toHaveBeenCalledWith('todo.shopping');
  expect(await proxy.subscribeItems('todo.shopping', listener, onError)).toBe(unsubscribe);
  expect(service.subscribeItems).toHaveBeenCalledWith('todo.shopping', listener, onError);
  const item = { summary: 'Milk' };
  await proxy.addItem('todo.shopping', item, 'session-a');
  expect(service.addItem).toHaveBeenCalledWith('todo.shopping', item, 'session-a');
  const update = { completed: true };
  await proxy.updateItem('todo.shopping', 'item-1', update, 'session-a');
  expect(service.updateItem).toHaveBeenCalledWith('todo.shopping', 'item-1', update, 'session-a');
  await proxy.removeItem('todo.shopping', 'item-1', 'session-a');
  expect(service.removeItem).toHaveBeenCalledWith('todo.shopping', 'item-1', 'session-a');
  expect(loaded).toHaveBeenCalledTimes(1);
});

it('preserves provider errors for the Lists recovery flow', async () => {
  const { lazyHomeAssistantTodoListFeatureService: proxy } = await import(
    './homeassistant-todo-feature.service.lazy'
  );
  const error = new Error('Shared list is unavailable');
  service.getItems.mockRejectedValueOnce(error);
  await expect(proxy.getItems('todo.shopping')).rejects.toBe(error);
});
