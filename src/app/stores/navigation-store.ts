import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { pathToSection, type Section, sectionToPath } from '../navigation/sections';

interface NavigationState {
  currentRoom: string;
  activeSection: Section;
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
      applyNavigationState: ({ currentRoom, activeSection }) => set({ currentRoom, activeSection }),
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      setActiveSection: (activeSection) => {
        history.pushState({}, '', sectionToPath(activeSection));
        window.scrollTo(0, 0);
        set({ activeSection });
      },
    }),
    {
      name: 'ha-dashboard-navigation',
      storage: createJSONStorage(() => localStorage),
      // Only persist currentRoom — activeSection is derived from the URL
      partialize: (state) => ({ currentRoom: state.currentRoom }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<NavigationState> | null) ?? {};
        return {
          ...current,
          currentRoom:
            typeof p.currentRoom === 'string' && p.currentRoom.length > 0 ? p.currentRoom : 'All',
        };
      },
    }
  )
);

// Sync Zustand with browser back/forward navigation
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    useNavigationStore.setState({ activeSection: pathToSection(window.location.pathname) });
  });
}
