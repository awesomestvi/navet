import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EnergyRange, EnergyWidgetId } from '../types/energy.types';
import { normalizeEnergyRange } from '../utils/build-energy-dashboard-model';

interface EnergyDashboardState {
  range: EnergyRange;
  selectedNodeId: string | null;
  visibleWidgets: EnergyWidgetId[];
  setRange: (range: EnergyRange) => void;
  setSelectedNodeId: (selectedNodeId: string | null) => void;
  setVisibleWidgets: (visibleWidgets: EnergyWidgetId[]) => void;
  toggleWidgetVisibility: (widgetId: EnergyWidgetId) => void;
}

const defaultWidgets: EnergyWidgetId[] = [
  'status',
  'flow',
  'consumers',
  'cost',
  'trend',
  'battery',
  'storage',
  'heating',
  'insights',
];

function normalizePersistedRange(range: unknown): EnergyRange {
  return normalizeEnergyRange(
    range === 'now' || range === 'today' || range === 'week' || range === 'month'
      ? range
      : range === 'live' || range === 'day'
        ? range
        : 'today'
  );
}

export const useEnergyDashboardStore = create<EnergyDashboardState>()(
  persist(
    (set) => ({
      range: 'today',
      selectedNodeId: null,
      visibleWidgets: defaultWidgets,
      setRange: (range) => set({ range: normalizePersistedRange(range) }),
      setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
      setVisibleWidgets: (visibleWidgets) => set({ visibleWidgets }),
      toggleWidgetVisibility: (widgetId) =>
        set((state) => ({
          visibleWidgets: state.visibleWidgets.includes(widgetId)
            ? state.visibleWidgets.filter((id) => id !== widgetId)
            : [...state.visibleWidgets, widgetId],
        })),
    }),
    {
      name: 'navet-energy-dashboard',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        range: state.range,
        visibleWidgets: state.visibleWidgets,
      }),
      merge: (persisted, current) => {
        const next = (persisted as Partial<EnergyDashboardState> | null) ?? {};
        return {
          ...current,
          range: normalizePersistedRange(next.range ?? current.range),
          visibleWidgets:
            Array.isArray(next.visibleWidgets) && next.visibleWidgets.length > 0
              ? next.visibleWidgets
              : current.visibleWidgets,
        };
      },
    }
  )
);
