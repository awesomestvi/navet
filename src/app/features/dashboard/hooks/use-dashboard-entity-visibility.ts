import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';

export function useDashboardEntityVisibility() {
  const hiddenEntityIds = useDashboardEntitiesStore((state) => state.hiddenEntityIds);
  const hideAutoEntity = useDashboardEntitiesStore((state) => state.hideEntity);
  const showAutoEntity = useDashboardEntitiesStore((state) => state.showEntity);

  return {
    hiddenEntityIds,
    hideAutoEntity,
    showAutoEntity,
  };
}
