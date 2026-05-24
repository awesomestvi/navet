import { useShallow } from 'zustand/react/shallow';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';

export function useDashboardEntityVisibility() {
  return useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      shownSensorEntityIds: state.shownSensorEntityIds,
      hideAutoEntity: state.hideEntity,
      showAutoEntity: state.showEntity,
    }))
  );
}
