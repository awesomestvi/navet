import { usePersistedState } from '@navet/app/hooks/use-persisted-state';

export const LOCAL_HABITS_FEATURE_STORAGE_KEY = 'navet-settings-local-habits-tab-enabled';

export function useLocalHabitsFeature() {
  return usePersistedState<boolean>(LOCAL_HABITS_FEATURE_STORAGE_KEY, false);
}
