import type { ProviderTodoListFeatureService } from '@navet/core/provider-feature-services';

async function getService(): Promise<ProviderTodoListFeatureService> {
  const module = await import('./homeassistant-todo-feature.service');
  return module.homeAssistantTodoListFeatureService;
}

/** Load list transport and subscriptions only when the Lists workspace uses them. */
export const lazyHomeAssistantTodoListFeatureService: ProviderTodoListFeatureService = {
  async getLists() {
    return (await getService()).getLists();
  },
  async subscribeLists(listener, onError) {
    return (await getService()).subscribeLists(listener, onError);
  },
  async getItems(listId) {
    return (await getService()).getItems(listId);
  },
  async subscribeItems(listId, listener, onError) {
    return (await getService()).subscribeItems(listId, listener, onError);
  },
  async addItem(listId, item, expectedSessionKey) {
    return (await getService()).addItem(listId, item, expectedSessionKey);
  },
  async updateItem(listId, uid, update, expectedSessionKey) {
    return (await getService()).updateItem(listId, uid, update, expectedSessionKey);
  },
  async removeItem(listId, uid, expectedSessionKey) {
    return (await getService()).removeItem(listId, uid, expectedSessionKey);
  },
};
