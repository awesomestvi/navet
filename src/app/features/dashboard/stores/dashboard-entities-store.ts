import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DashboardEntitiesState {
  hiddenEntityIds: string[];
  onboardingCompleted: boolean;
  replaceDashboardEntitiesState: (state: {
    hiddenEntityIds: string[];
    onboardingCompleted: boolean;
  }) => void;
  completeOnboarding: (entityIds: string[], startBlank: boolean) => void;
  markOnboardingCompleted: () => void;
  hideEntity: (entityId: string) => void;
  showEntity: (entityId: string) => void;
  showAllEntities: () => void;
  resetHiddenEntities: () => void;
  reopenOnboarding: () => void;
}

export const useDashboardEntitiesStore = create<DashboardEntitiesState>()(
  persist(
    (set) => ({
      hiddenEntityIds: [],
      onboardingCompleted: false,
      replaceDashboardEntitiesState: ({ hiddenEntityIds, onboardingCompleted }) =>
        set({ hiddenEntityIds, onboardingCompleted }),
      completeOnboarding: (entityIds, startBlank) =>
        set({
          hiddenEntityIds: startBlank ? entityIds : [],
          onboardingCompleted: true,
        }),
      markOnboardingCompleted: () => set({ onboardingCompleted: true }),
      hideEntity: (entityId) =>
        set((state) => ({
          hiddenEntityIds: state.hiddenEntityIds.includes(entityId)
            ? state.hiddenEntityIds
            : [...state.hiddenEntityIds, entityId],
        })),
      showEntity: (entityId) =>
        set((state) => ({
          hiddenEntityIds: state.hiddenEntityIds.filter((id) => id !== entityId),
        })),
      showAllEntities: () => set({ hiddenEntityIds: [] }),
      resetHiddenEntities: () => set({ hiddenEntityIds: [] }),
      reopenOnboarding: () => set({ onboardingCompleted: false }),
    }),
    {
      name: 'navet-dashboard-entities',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Record<string, unknown> | null) ?? {};
        const hiddenEntityIds = Array.isArray(persisted.hiddenEntityIds)
          ? persisted.hiddenEntityIds.filter((item): item is string => typeof item === 'string')
          : [];

        const onboardingCompleted =
          typeof persisted.onboardingCompleted === 'boolean'
            ? persisted.onboardingCompleted
            : hiddenEntityIds.length > 0;

        return {
          ...currentState,
          ...persisted,
          hiddenEntityIds,
          onboardingCompleted,
        };
      },
    }
  )
);
