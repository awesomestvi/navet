import { createProviderScopedId } from '@navet/core/ids';
import type { PlatformMessageClient } from '@navet/core/provider-feature-models';
import type { ProviderTodoListFeatureService } from '@navet/core/provider-feature-services';
import type { NavetTodoItem, NavetTodoItemInput, NavetTodoList } from '@navet/core/todo-types';
import {
  addHomeAssistantListener,
  getHomeAssistantConnection,
  getHomeAssistantEntities,
  getHomeAssistantEntityRegistry,
  getHomeAssistantPanelHass,
  isHomeAssistantConnected,
} from './homeassistant-service-bridge';

function sourceIdentity() {
  const panel = getHomeAssistantPanelHass() as { connection?: unknown; callWS?: unknown } | null;
  // Frontend hass objects can change per state update; their authenticated callWS transport is stable.
  return panel ? (panel.connection ?? panel.callWS) : getHomeAssistantConnection();
}

function getList(listId: string): NavetTodoList {
  const entity = getHomeAssistantEntities()?.[listId];
  if (!listId.startsWith('todo.') || !entity) throw new Error('Shared list is no longer available');
  const features =
    typeof entity.attributes.supported_features === 'number'
      ? entity.attributes.supported_features
      : 0;
  const registry = getHomeAssistantEntityRegistry().find((entry) => entry.entity_id === listId);
  return {
    id: createProviderScopedId('home_assistant', listId),
    providerId: 'home_assistant',
    externalId: listId,
    name:
      registry?.name ||
      String(entity.attributes.friendly_name || registry?.original_name || listId.slice(5)),
    available:
      entity.state !== 'unavailable' &&
      entity.state !== 'unknown' &&
      getHomeAssistantConnection() !== null &&
      isHomeAssistantConnected(),
    capabilities: {
      add: !!(features & 1),
      remove: !!(features & 2),
      update: !!(features & 4),
      dueDate: !!(features & 16),
      dueDateTime: !!(features & 32),
      description: !!(features & 64),
    },
  };
}

function normalizeItems(result: unknown): NavetTodoItem[] {
  if (
    !result ||
    typeof result !== 'object' ||
    !Array.isArray((result as { items?: unknown }).items)
  )
    throw new Error('Invalid shared list response');
  return (result as { items: unknown[] }).items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid shared list item');
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.uid !== 'string' ||
      !raw.uid ||
      typeof raw.summary !== 'string' ||
      (raw.status !== 'needs_action' && raw.status !== 'completed')
    )
      throw new Error('Invalid shared list item');
    const due = typeof raw.due === 'string' ? raw.due : undefined;
    return {
      uid: raw.uid,
      summary: raw.summary,
      completed: raw.status === 'completed',
      ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
      ...(due ? (/^\d{4}-\d{2}-\d{2}$/.test(due) ? { dueDate: due } : { dueDateTime: due }) : {}),
    };
  });
}

function clientFor(listId: string, capability?: 'add' | 'update' | 'remove') {
  const list = getList(listId);
  const client = getHomeAssistantConnection();
  if (!client || !list.available) throw new Error('Shared list is unavailable');
  if (capability && !list.capabilities[capability])
    throw new Error('This list does not support this action');
  return { client, list };
}

function optionalFields(list: NavetTodoList, input: Partial<NavetTodoItemInput>) {
  if (input.dueDate !== undefined && input.dueDateTime !== undefined)
    throw new Error('Choose a date or a date and time');
  const data: Record<string, unknown> = {};
  for (const [field, serviceField] of [
    ['description', 'description'],
    ['dueDate', 'due_date'],
    ['dueDateTime', 'due_datetime'],
  ] as const) {
    if (input[field] !== undefined) {
      if (!list.capabilities[field]) throw new Error('This list does not support this item field');
      data[serviceField] = input[field];
    }
  }
  return data;
}

function summary(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Item name is required');
  return trimmed;
}

async function call(
  client: PlatformMessageClient,
  listId: string,
  service: string,
  data: Record<string, unknown>
) {
  await client.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service,
    service_data: data,
    target: { entity_id: listId },
  });
}

export const homeAssistantTodoListFeatureService: ProviderTodoListFeatureService = {
  async getLists() {
    return Object.keys(getHomeAssistantEntities() ?? {})
      .filter((id) => id.startsWith('todo.'))
      .map(getList);
  },
  async subscribeLists(listener, onError) {
    let disposed = false;
    let generation = 0;
    const publish = () => {
      const attempt = ++generation;
      const source = sourceIdentity();
      void homeAssistantTodoListFeatureService
        .getLists()
        .then((lists) => {
          if (!disposed && attempt === generation && source === sourceIdentity()) listener(lists);
        })
        .catch((error) => {
          if (!disposed && attempt === generation) onError?.(error);
        });
    };
    const unsubscribers = ['entities', 'registries', 'connection'].map((event) =>
      addHomeAssistantListener(event as 'entities' | 'registries' | 'connection', publish)
    );
    publish();
    return () => {
      disposed = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  },
  async getItems(listId) {
    const { client } = clientFor(listId);
    const source = sourceIdentity();
    const result = await client.sendMessagePromise<{ response?: Record<string, unknown> }>({
      type: 'call_service',
      domain: 'todo',
      service: 'get_items',
      service_data: {},
      target: { entity_id: listId },
      return_response: true,
    });
    if (source !== sourceIdentity()) throw new Error('Shared list connection changed');
    return normalizeItems(result.response?.[listId]);
  },
  async subscribeItems(listId, listener, onError) {
    let disposed = false;
    let generation = 0;
    let currentSource: unknown;
    let activeUnsubscribe: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (activeUnsubscribe)
        void Promise.resolve(activeUnsubscribe()).catch((error) => onError?.(error));
      activeUnsubscribe = null;
      if (poll !== null) clearInterval(poll);
      poll = null;
    };
    const bind = async () => {
      const source = sourceIdentity();
      if (disposed || source === currentSource) return;
      const replacedSource = currentSource !== undefined;
      currentSource = source;
      const attempt = ++generation;
      stop();
      if (replacedSource && source) listener([]);
      if (!source) {
        listener([]);
        return;
      }
      const { client } = clientFor(listId);
      const publish = (result: unknown) => {
        if (disposed || attempt !== generation || source !== sourceIdentity()) return;
        try {
          listener(normalizeItems(result));
        } catch (error) {
          onError?.(error);
        }
      };
      let unsubscribe: () => void = () => {};
      try {
        if (!client.subscribeMessage)
          throw new Error('Home Assistant panel connection cannot subscribe');
        unsubscribe = await client.subscribeMessage(publish, {
          type: 'todo/item/subscribe',
          entity_id: listId,
        });
      } catch (error) {
        if (disposed || attempt !== generation || source !== sourceIdentity()) return;
        const code =
          error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
        const message = error instanceof Error ? error.message : '';
        const cannotSubscribe = message === 'Home Assistant panel connection cannot subscribe';
        if (code !== 'unknown_command' && message !== 'unknown_command' && !cannotSubscribe)
          throw error;
        // Older HA versions expose only the list read API; polling also catches same-count edits.
        let refreshing = false;
        const refresh = async () => {
          if (refreshing || disposed || attempt !== generation) return;
          refreshing = true;
          try {
            const items = await homeAssistantTodoListFeatureService.getItems(listId);
            if (!disposed && attempt === generation) listener(items);
          } catch (error) {
            if (!disposed && attempt === generation) onError?.(error);
          } finally {
            refreshing = false;
          }
        };
        if (!cannotSubscribe && client.subscribeMessage) {
          try {
            unsubscribe = await client.subscribeMessage<{ data?: { entity_id?: string } }>(
              (event) => {
                if (event.data?.entity_id === listId) void refresh();
              },
              { type: 'subscribe_events', event_type: 'state_changed' }
            );
          } catch (error) {
            if (disposed || attempt !== generation || source !== sourceIdentity()) return;
            throw error;
          }
        }
        if (!disposed && attempt === generation) {
          poll = setInterval(() => {
            void refresh();
          }, 30_000);
          void refresh();
        }
      }
      if (disposed || attempt !== generation || source !== sourceIdentity())
        void Promise.resolve(unsubscribe()).catch((error) => onError?.(error));
      else activeUnsubscribe = unsubscribe;
    };
    const stopConnectionListener = addHomeAssistantListener('connection', () => {
      const binding = bind();
      const attempt = generation;
      void binding.catch((error) => {
        if (!disposed && attempt === generation) onError?.(error);
      });
    });
    const initialBinding = bind();
    const initialAttempt = generation;
    const initialSource = currentSource;
    try {
      await initialBinding;
    } catch (error) {
      if (!disposed && initialAttempt === generation && initialSource === sourceIdentity()) {
        stopConnectionListener();
        stop();
        throw error;
      }
    }
    return () => {
      disposed = true;
      generation += 1;
      stopConnectionListener();
      stop();
    };
  },
  async addItem(listId, input) {
    const { client, list } = clientFor(listId, 'add');
    await call(client, listId, 'add_item', {
      item: summary(input.summary),
      ...optionalFields(list, input),
    });
  },
  async updateItem(listId, uid, input) {
    const { client, list } = clientFor(listId, 'update');
    if (!uid) throw new Error('Item identifier is required');
    const data: Record<string, unknown> = { ...optionalFields(list, input) };
    if (input.summary !== undefined) data.rename = summary(input.summary);
    if (input.completed !== undefined) data.status = input.completed ? 'completed' : 'needs_action';
    if (!Object.keys(data).length) throw new Error('An item change is required');
    await call(client, listId, 'update_item', { item: uid, ...data });
  },
  async removeItem(listId, uid) {
    const { client } = clientFor(listId, 'remove');
    if (!uid) throw new Error('Item identifier is required');
    await call(client, listId, 'remove_item', { item: uid });
  },
};
