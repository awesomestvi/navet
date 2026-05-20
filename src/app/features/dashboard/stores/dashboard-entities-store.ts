import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DashboardEntitiesState {
  hiddenEntityIds: string[];
  lockedCardIds: string[];
  onboardingCompleted: boolean;
  replaceDashboardEntitiesState: (state: {
    hiddenEntityIds: string[];
    lockedCardIds?: string[];
    onboardingCompleted: boolean;
  }) => void;
  completeOnboarding: (entityIds: string[], startBlank: boolean) => void;
  markOnboardingCompleted: () => void;
  hideEntity: (entityId: string) => void;
  showEntity: (entityId: string) => void;
  showAllEntities: () => void;
  resetHiddenEntities: () => void;
  lockCard: (cardId: string) => void;
  unlockCard: (cardId: string) => void;
  toggleCardLock: (cardId: string) => void;
  reopenOnboarding: () => void;
}

function normalizeLockedCardIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string')));
}

export const useDashboardEntitiesStore = create<DashboardEntitiesState>()(
  persist(
    (set) => ({
      hiddenEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
      replaceDashboardEntitiesState: ({
        hiddenEntityIds,
        lockedCardIds = [],
        onboardingCompleted,
      }) =>
        set({
          hiddenEntityIds,
          lockedCardIds: normalizeLockedCardIds(lockedCardIds),
          onboardingCompleted,
        }),
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
      lockCard: (cardId) =>
        set((state) => ({
          lockedCardIds: state.lockedCardIds.includes(cardId)
            ? state.lockedCardIds
            : [...state.lockedCardIds, cardId],
        })),
      unlockCard: (cardId) =>
        set((state) => ({
          lockedCardIds: state.lockedCardIds.filter((id) => id !== cardId),
        })),
      toggleCardLock: (cardId) =>
        set((state) => ({
          lockedCardIds: state.lockedCardIds.includes(cardId)
            ? state.lockedCardIds.filter((id) => id !== cardId)
            : [...state.lockedCardIds, cardId],
        })),
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
        const lockedCardIds = normalizeLockedCardIds(persisted.lockedCardIds);

        const onboardingCompleted =
          typeof persisted.onboardingCompleted === 'boolean'
            ? persisted.onboardingCompleted
            : hiddenEntityIds.length > 0;

        return {
          ...currentState,
          ...persisted,
          hiddenEntityIds,
          lockedCardIds,
          onboardingCompleted,
        };
      },
    }
  )
);
