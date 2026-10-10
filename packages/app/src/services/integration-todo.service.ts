import type { IntegrationProviderId } from '@navet/core/integration-providers';
import type { ProviderTodoListFeatureService } from '@navet/core/provider-feature-services';
import type {
  NavetTodoItem,
  NavetTodoItemInput,
  NavetTodoItemUpdate,
  NavetTodoList,
} from '@navet/core/todo-types';
import { getIntegrationProviderAdapter } from './integration-registry.service';

function serviceFor(list: NavetTodoList): ProviderTodoListFeatureService {
  const service = getIntegrationProviderAdapter(list.providerId).todoListFeatureService;
  if (!service) throw new Error('This provider does not support shared lists');
  return service;
}

export async function getIntegrationTodoLists(
  providerIds: IntegrationProviderId[]
): Promise<NavetTodoList[]> {
  const lists = await Promise.all(
    [...new Set(providerIds)].map(async (providerId) => {
      const service = getIntegrationProviderAdapter(providerId).todoListFeatureService;
      return service ? await service.getLists() : [];
    })
  );
  return lists.flat();
}

export function getIntegrationTodoItems(list: NavetTodoList) {
  return serviceFor(list).getItems(list.externalId);
}

export function subscribeIntegrationTodoItems(
  list: NavetTodoList,
  listener: (items: NavetTodoItem[]) => void,
  onError?: (error: unknown) => void
) {
  return serviceFor(list).subscribeItems(list.externalId, listener, onError);
}

export function addIntegrationTodoItem(list: NavetTodoList, item: NavetTodoItemInput) {
  return serviceFor(list).addItem(list.externalId, item);
}

export function updateIntegrationTodoItem(
  list: NavetTodoList,
  uid: string,
  update: NavetTodoItemUpdate
) {
  return serviceFor(list).updateItem(list.externalId, uid, update);
}

export function removeIntegrationTodoItem(list: NavetTodoList, uid: string) {
  return serviceFor(list).removeItem(list.externalId, uid);
}

export async function subscribeIntegrationTodoLists(
  providerIds: IntegrationProviderId[],
  listener: (lists: NavetTodoList[]) => void,
  onError?: (error: unknown) => void
): Promise<() => void> {
  const snapshots = new Map<IntegrationProviderId, NavetTodoList[]>();
  const unsubscribers: (() => void)[] = [];
  let disposed = false;
  try {
    for (const providerId of [...new Set(providerIds)]) {
      const service = getIntegrationProviderAdapter(providerId).todoListFeatureService;
      if (!service) continue;
      unsubscribers.push(
        await service.subscribeLists((lists) => {
          if (disposed) return;
          snapshots.set(providerId, lists);
          listener([...snapshots.values()].flat());
        }, onError)
      );
    }
    if (!snapshots.size) listener([]);
  } catch (error) {
    disposed = true;
    for (const unsubscribe of unsubscribers) unsubscribe();
    throw error;
  }
  return () => {
    disposed = true;
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
