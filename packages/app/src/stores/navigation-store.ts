import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  readLocalStorageWithMigration,
  removeLocalStorageWithMigration,
  writeLocalStorageWithMigration,
} from '@navet/app/utils/local-storage-migration';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  customSidebarActionToPath,
  isSection,
  pathToDestination,
  type Section,
  sectionToPath,
} from '../navigation/sections';

let navigationStoreCleanup: (() => void) | null = null;
const MAX_RECENT_SECTIONS = 3;

function getRecentSectionHistory(nextSection: Section, currentRecentSections: Section[]) {
  if (nextSection === 'home') {
    return currentRecentSections;
  }

  return [nextSection, ...currentRecentSections.filter((section) => section !== nextSection)].slice(
    0,
    MAX_RECENT_SECTIONS
  );
}

function sanitizeRecentSections(value: unknown): Section[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const recentSections: Section[] = [];

  for (const item of value) {
    if (!isSection(item) || item === 'home' || recentSections.includes(item)) {
      continue;
    }

    recentSections.push(item);
    if (recentSections.length >= MAX_RECENT_SECTIONS) {
      break;
    }
  }

  return recentSections;
}

interface NavigationState {
  currentRoom: string;
  lastExplicitRoom: string;
  activeSection: Section;
  activeCustomSidebarActionId: string | null;
  recentSections: Section[];
  lastNonHomeSection: Section | null;
  applyNavigationState: (state: { currentRoom: string; activeSection: Section }) => void;
  setCurrentRoom: (room: string, options?: { explicit?: boolean }) => void;
  setActiveSection: (section: Section) => void;
  setActiveCustomSidebarAction: (actionId: string) => void;
  syncActiveSectionFromLocation: (section: Section) => void;
}

function getInitialDestination() {
  if (typeof window === 'undefined') {
    return { activeSection: 'home' as Section, activeCustomSidebarActionId: null };
  }

  const destination = pathToDestination(window.location.pathname);
  return destination.kind === 'custom_sidebar'
    ? {
        activeSection: 'home' as Section,
        activeCustomSidebarActionId: destination.actionId,
      }
    : {
        activeSection: destination.section,
        activeCustomSidebarActionId: null,
      };
}

const initialDestination = getInitialDestination();

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      currentRoom: ALL_ROOMS_ID,
      lastExplicitRoom: ALL_ROOMS_ID,
      activeSection: initialDestination.activeSection,
      activeCustomSidebarActionId: initialDestination.activeCustomSidebarActionId,
      recentSections: [],
      lastNonHomeSection: null,
      applyNavigationState: ({ currentRoom, activeSection }) =>
        set((state) => {
          if (
            state.currentRoom === currentRoom &&
            state.lastExplicitRoom === currentRoom &&
            state.activeSection === activeSection &&
            state.activeCustomSidebarActionId === null
          ) {
            return state;
          }

          return {
            currentRoom,
            lastExplicitRoom: currentRoom,
            activeSection,
            activeCustomSidebarActionId: null,
          };
        }),
      setCurrentRoom: (currentRoom, options) =>
        set((state) => {
          const nextLastExplicitRoom =
            options?.explicit === false ? state.lastExplicitRoom : currentRoom;

          if (
            state.currentRoom === currentRoom &&
            state.lastExplicitRoom === nextLastExplicitRoom
          ) {
            return state;
          }

          return {
            currentRoom,
            lastExplicitRoom: nextLastExplicitRoom,
          };
        }),
      setActiveSection: (activeSection) => {
        history.pushState({}, '', sectionToPath(activeSection));
        window.scrollTo(0, 0);
        set((state) => {
          if (activeSection === 'home') {
            return { activeSection, activeCustomSidebarActionId: null };
          }

          return {
            activeSection,
            activeCustomSidebarActionId: null,
            lastNonHomeSection: activeSection,
            recentSections: getRecentSectionHistory(activeSection, state.recentSections),
          };
        });
      },
      setActiveCustomSidebarAction: (actionId) => {
        history.pushState({}, '', customSidebarActionToPath(actionId));
        window.scrollTo(0, 0);
        set((state) =>
          state.activeCustomSidebarActionId === actionId
            ? state
            : { activeCustomSidebarActionId: actionId }
        );
      },
      syncActiveSectionFromLocation: (activeSection) => {
        const destination = pathToDestination(window.location.pathname);
        set({
          activeSection: destination.kind === 'section' ? destination.section : activeSection,
          activeCustomSidebarActionId:
            destination.kind === 'custom_sidebar' ? destination.actionId : null,
        });
      },
    }),
    {
      name: STORE_STORAGE_KEYS.navigation,
      storage: createJSONStorage(() => ({
        getItem: (name) => readLocalStorageWithMigration(name, localStorage),
        setItem: (name, value) => writeLocalStorageWithMigration(name, value, localStorage),
        removeItem: (name) => removeLocalStorageWithMigration(name, localStorage),
      })),
      // activeSection is derived from the URL; mobile recents stay persisted.
      partialize: (state) => ({
        currentRoom: state.currentRoom,
        lastExplicitRoom: state.lastExplicitRoom,
        recentSections: state.recentSections,
        lastNonHomeSection: state.lastNonHomeSection,
      }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<NavigationState> | null) ?? {};
        return {
          ...current,
          currentRoom:
            typeof p.currentRoom === 'string' && p.currentRoom.length > 0
              ? p.currentRoom
              : ALL_ROOMS_ID,
          lastExplicitRoom:
            typeof p.lastExplicitRoom === 'string' && p.lastExplicitRoom.length > 0
              ? p.lastExplicitRoom
              : typeof p.currentRoom === 'string' && p.currentRoom.length > 0
                ? p.currentRoom
                : ALL_ROOMS_ID,
          recentSections: sanitizeRecentSections(p.recentSections),
          lastNonHomeSection:
            p.lastNonHomeSection &&
            isSection(p.lastNonHomeSection) &&
            p.lastNonHomeSection !== 'home'
              ? p.lastNonHomeSection
              : null,
        };
      },
    }
  )
);

export function startNavigationStoreSync() {
  if (typeof window === 'undefined' || navigationStoreCleanup) {
    return navigationStoreCleanup ?? (() => {});
  }

  const handlePopState = () => {
    const destination = pathToDestination(window.location.pathname);
    const section = destination.kind === 'section' ? destination.section : 'home';
    useNavigationStore.getState().syncActiveSectionFromLocation(section);
  };

  window.addEventListener('popstate', handlePopState);
  navigationStoreCleanup = () => {
    window.removeEventListener('popstate', handlePopState);
    navigationStoreCleanup = null;
  };

  return navigationStoreCleanup;
}
