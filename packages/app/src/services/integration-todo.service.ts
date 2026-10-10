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

function sessionArgument(list: NavetTodoList): [] | [string] {
  return list.sessionKey === undefined ? [] : [list.sessionKey];
}

async function writeToList(
  list: NavetTodoList,
  action: (service: ProviderTodoListFeatureService) => Promise<void>
) {
  const service = serviceFor(list);
  if (list.sessionKey !== undefined) {
    const current = (await service.getLists()).find(
      (candidate) => candidate.providerId === list.providerId && candidate.id === list.id
    );
    if (!current || current.sessionKey !== list.sessionKey)
      throw new Error('Shared list connection changed');
  }
  return action(service);
}

export async function addIntegrationTodoItem(list: NavetTodoList, item: NavetTodoItemInput) {
  return writeToList(list, (service) =>
    service.addItem(list.externalId, item, ...sessionArgument(list))
  );
}

export async function updateIntegrationTodoItem(
  list: NavetTodoList,
  uid: string,
  update: NavetTodoItemUpdate
) {
  return writeToList(list, (service) =>
    service.updateItem(list.externalId, uid, update, ...sessionArgument(list))
  );
}

export async function removeIntegrationTodoItem(list: NavetTodoList, uid: string) {
  return writeToList(list, (service) =>
    service.removeItem(list.externalId, uid, ...sessionArgument(list))
  );
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
