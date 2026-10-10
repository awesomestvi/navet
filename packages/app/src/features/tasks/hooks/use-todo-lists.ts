import {
  getIntegrationTodoLists,
  subscribeIntegrationTodoLists,
} from '@navet/app/services/integration-todo.service';
import type { IntegrationProviderId } from '@navet/core/integration-providers';
import type { NavetTodoList } from '@navet/core/todo-types';
import { useEffect, useState } from 'react';

export function useTodoLists(providerIds: IntegrationProviderId[]) {
  const providerKey = providerIds.join(',');
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    key: string;
    lists: NavetTodoList[];
    loading: boolean;
    error: boolean;
  }>({ key: providerKey, lists: [], loading: true, error: false });
  useEffect(() => {
    let active = true;
    let subscribed = false;
    let unsubscribe: (() => void) | undefined;
    const selected = providerKey.split(',').filter(Boolean) as IntegrationProviderId[];
    setState({ key: providerKey, lists: [], loading: true, error: false });
    void getIntegrationTodoLists(selected)
      .then((lists) => {
        if (active && !subscribed)
          setState({ key: providerKey, lists, loading: false, error: false });
      })
      .catch(() => {
        if (active && !subscribed)
          setState({ key: providerKey, lists: [], loading: false, error: true });
      });
    void subscribeIntegrationTodoLists(
      selected,
      (lists) => {
        if (!active) return;
        subscribed = true;
        if (active) setState({ key: providerKey, lists, loading: false, error: false });
      },
      () => {
        if (active) setState((current) => ({ ...current, loading: false, error: true }));
      }
    )
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch(() => {
        if (active) setState((current) => ({ ...current, loading: false, error: true }));
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [providerKey, retry]);
  return {
    ...(state.key === providerKey ? state : { lists: [], loading: true, error: false }),
    retry: () => setRetry((value) => value + 1),
  };
}
