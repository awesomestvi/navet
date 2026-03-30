import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';

export function useDashboardEntityVisibility() {
  const { hiddenEntityIds, hideAutoEntity, showAutoEntity } = useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      hideAutoEntity: state.hideEntity,
      showAutoEntity: state.showEntity,
    }))
  );

  return useMemo(
    () => ({
      hiddenEntityIds,
      hideAutoEntity,
      showAutoEntity,
    }),
    [hiddenEntityIds, hideAutoEntity, showAutoEntity]
  );
}
