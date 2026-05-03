import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isSection, pathToSection, type Section, sectionToPath } from '../navigation/sections';

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
  activeSection: Section;
  recentSections: Section[];
  lastNonHomeSection: Section | null;
  applyNavigationState: (state: { currentRoom: string; activeSection: Section }) => void;
  setCurrentRoom: (room: string) => void;
  setActiveSection: (section: Section) => void;
}

const initialSection = (): Section =>
  typeof window === 'undefined' ? 'home' : pathToSection(window.location.pathname);

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      currentRoom: 'All',
      activeSection: initialSection(),
      recentSections: [],
      lastNonHomeSection: null,
      applyNavigationState: ({ currentRoom, activeSection }) => set({ currentRoom, activeSection }),
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      setActiveSection: (activeSection) => {
        history.pushState({}, '', sectionToPath(activeSection));
        window.scrollTo(0, 0);
        set((state) => {
          if (activeSection === 'home') {
            return { activeSection };
          }

          return {
            activeSection,
            lastNonHomeSection: activeSection,
            recentSections: getRecentSectionHistory(activeSection, state.recentSections),
          };
        });
      },
    }),
    {
      name: 'ha-dashboard-navigation',
      storage: createJSONStorage(() => localStorage),
      // activeSection is derived from the URL; mobile recents stay persisted.
      partialize: (state) => ({
        currentRoom: state.currentRoom,
        recentSections: state.recentSections,
        lastNonHomeSection: state.lastNonHomeSection,
      }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<NavigationState> | null) ?? {};
        return {
          ...current,
          currentRoom:
            typeof p.currentRoom === 'string' && p.currentRoom.length > 0 ? p.currentRoom : 'All',
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
    useNavigationStore.setState({ activeSection: pathToSection(window.location.pathname) });
  };

  window.addEventListener('popstate', handlePopState);
  navigationStoreCleanup = () => {
    window.removeEventListener('popstate', handlePopState);
    navigationStoreCleanup = null;
  };

  return navigationStoreCleanup;
}
