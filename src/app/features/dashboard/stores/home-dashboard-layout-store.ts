import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { ensureCanonicalEntityId } from '@/app/utils/provider-entity-id';
import type { SectionLayoutItem } from '../utils/layout-engine';
import { normalizeLayout } from '../utils/layout-migration';

export type HomeLayoutMode = 'flow' | 'sectioned';
export type HomeDashboardSectionSpan = number;

export interface HomeDashboardSection extends SectionLayoutItem {
  span: HomeDashboardSectionSpan;
}

export interface HomeDashboardLayoutState {
  mode: HomeLayoutMode;
  showHero: boolean;
  cardIds: string[];
  sections: HomeDashboardSection[];
  cardSectionAssignments: Record<string, string>;
}

interface HomeDashboardLayoutStore extends HomeDashboardLayoutState {
  replaceLayout: (layout: HomeDashboardLayoutState) => void;
  updateLayout: (
    updater:
      | HomeDashboardLayoutState
      | ((previous: HomeDashboardLayoutState) => HomeDashboardLayoutState)
  ) => void;
}

export const DEFAULT_HOME_DASHBOARD_LAYOUT: HomeDashboardLayoutState = {
  mode: 'flow',
  showHero: true,
  cardIds: [],
  sections: [],
  cardSectionAssignments: {},
};

function toHomeSection(section: SectionLayoutItem): HomeDashboardSection {
  return {
    ...section,
    span: section.w,
  };
}

function normalizeHomeDashboardLayout(value: unknown): HomeDashboardLayoutState {
  const normalized = normalizeLayout(value);

  return {
    mode: normalized.mode,
    showHero: normalized.showHero,
    cardIds: normalized.cardIds.map((id) => ensureCanonicalEntityId(id)),
    sections: normalized.sections.map(toHomeSection),
    cardSectionAssignments: Object.fromEntries(
      Object.entries(normalized.cardSectionAssignments).map(([id, sectionId]) => [
        ensureCanonicalEntityId(id),
        sectionId,
      ])
    ),
  };
}

export const useHomeDashboardLayoutStore = create<HomeDashboardLayoutStore>()(
  persist(
    (set) => ({
      ...DEFAULT_HOME_DASHBOARD_LAYOUT,
      replaceLayout: (layout) => set(normalizeHomeDashboardLayout(layout)),
      updateLayout: (updater) =>
        set((previous) => (typeof updater === 'function' ? updater(previous) : updater)),
    }),
    {
      name: STORAGE_KEYS.homeDashboardLayout,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        showHero: state.showHero,
        cardIds: state.cardIds,
        sections: state.sections,
        cardSectionAssignments: state.cardSectionAssignments,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...normalizeHomeDashboardLayout(persisted),
      }),
    }
  )
);
