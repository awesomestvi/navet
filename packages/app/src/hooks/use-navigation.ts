import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Section } from '../navigation/sections';
import { useNavigationStore } from '../stores/navigation-store';

interface NavigationState {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

export function useNavigation(): NavigationState {
  const { activeSection, setActiveSection } = useNavigationStore(
    useShallow((state) => ({
      activeSection: state.activeSection,
      setActiveSection: state.setActiveSection,
    }))
  );

  return useMemo(() => ({ activeSection, setActiveSection }), [activeSection, setActiveSection]);
}
