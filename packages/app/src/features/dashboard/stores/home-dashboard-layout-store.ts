import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  readLocalStorageWithMigration,
  removeLocalStorageWithMigration,
  writeLocalStorageWithMigration,
} from '@navet/app/utils/local-storage-migration';
import { ensureCanonicalEntityId } from '@navet/app/utils/provider-entity-id';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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
  canRedo: boolean;
  canUndo: boolean;
  future: HomeDashboardLayoutState[];
  past: HomeDashboardLayoutState[];
  replaceLayout: (layout: HomeDashboardLayoutState) => void;
  redoLayout: () => void;
  undoLayout: () => void;
  updateLayout: (
    updater:
      | HomeDashboardLayoutState
      | ((previous: HomeDashboardLayoutState) => HomeDashboardLayoutState)
  ) => void;
}

const HOME_LAYOUT_HISTORY_LIMIT = 50;

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

function pickLayoutState(state: HomeDashboardLayoutState): HomeDashboardLayoutState {
  return {
    mode: state.mode,
    showHero: state.showHero,
    cardIds: [...state.cardIds],
    sections: state.sections.map((section) => ({ ...section })),
    cardSectionAssignments: { ...state.cardSectionAssignments },
  };
}

function areLayoutsEqual(left: HomeDashboardLayoutState, right: HomeDashboardLayoutState) {
  return JSON.stringify(pickLayoutState(left)) === JSON.stringify(pickLayoutState(right));
}

function pushPast(
  past: HomeDashboardLayoutState[],
  previous: HomeDashboardLayoutState
): HomeDashboardLayoutState[] {
  return [...past, pickLayoutState(previous)].slice(-HOME_LAYOUT_HISTORY_LIMIT);
}

export const useHomeDashboardLayoutStore = create<HomeDashboardLayoutStore>()(
  persist(
    (set) => ({
      ...DEFAULT_HOME_DASHBOARD_LAYOUT,
      canRedo: false,
      canUndo: false,
      future: [],
      past: [],
      replaceLayout: (layout) =>
        set((previous) => {
          const nextLayout = normalizeHomeDashboardLayout(layout);
          if (areLayoutsEqual(previous, nextLayout)) {
            return previous;
          }

          return {
            ...nextLayout,
            canRedo: false,
            canUndo: true,
            future: [],
            past: pushPast(previous.past, previous),
          };
        }),
      redoLayout: () =>
        set((previous) => {
          const nextLayout = previous.future[0];
          if (!nextLayout) {
            return previous;
          }

          const future = previous.future.slice(1);
          return {
            ...pickLayoutState(nextLayout),
            canRedo: future.length > 0,
            canUndo: true,
            future,
            past: pushPast(previous.past, previous),
          };
        }),
      undoLayout: () =>
        set((previous) => {
          const nextLayout = previous.past.at(-1);
          if (!nextLayout) {
            return previous;
          }

          const past = previous.past.slice(0, -1);
          return {
            ...pickLayoutState(nextLayout),
            canRedo: true,
            canUndo: past.length > 0,
            future: [pickLayoutState(previous), ...previous.future].slice(
              0,
              HOME_LAYOUT_HISTORY_LIMIT
            ),
            past,
          };
        }),
      updateLayout: (updater) =>
        set((previous) => {
          const nextLayout = normalizeHomeDashboardLayout(
            typeof updater === 'function' ? updater(previous) : updater
          );
          if (areLayoutsEqual(previous, nextLayout)) {
            return previous;
          }

          return {
            ...nextLayout,
            canRedo: false,
            canUndo: true,
            future: [],
            past: pushPast(previous.past, previous),
          };
        }),
    }),
    {
      name: STORAGE_KEYS.homeDashboardLayout,
      storage: createJSONStorage(() => ({
        getItem: (name) => readLocalStorageWithMigration(name, localStorage),
        setItem: (name, value) => writeLocalStorageWithMigration(name, value, localStorage),
        removeItem: (name) => removeLocalStorageWithMigration(name, localStorage),
      })),
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
        canRedo: false,
        canUndo: false,
        future: [],
        past: [],
      }),
    }
  )
);
