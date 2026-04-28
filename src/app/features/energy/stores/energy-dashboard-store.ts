import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EnergyRange, EnergySourceConfig, EnergyWidgetId } from '../types/energy.types';
import { normalizeEnergyRange } from '../utils/build-energy-dashboard-model';

interface EnergyDashboardState {
  range: EnergyRange;
  selectedNodeId: string | null;
  visibleWidgets: EnergyWidgetId[];
  /** null = not yet configured; shows demo data + setup prompt */
  sourceConfig: EnergySourceConfig | null;
  setRange: (range: EnergyRange) => void;
  setSelectedNodeId: (selectedNodeId: string | null) => void;
  setVisibleWidgets: (visibleWidgets: EnergyWidgetId[]) => void;
  toggleWidgetVisibility: (widgetId: EnergyWidgetId) => void;
  setSourceConfig: (config: EnergySourceConfig) => void;
  clearSourceConfig: () => void;
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
      sourceConfig: null,
      setRange: (range) => set({ range: normalizePersistedRange(range) }),
      setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
      setVisibleWidgets: (visibleWidgets) => set({ visibleWidgets }),
      toggleWidgetVisibility: (widgetId) =>
        set((state) => ({
          visibleWidgets: state.visibleWidgets.includes(widgetId)
            ? state.visibleWidgets.filter((id) => id !== widgetId)
            : [...state.visibleWidgets, widgetId],
        })),
      setSourceConfig: (sourceConfig) => set({ sourceConfig }),
      clearSourceConfig: () => set({ sourceConfig: null }),
    }),
    {
      name: 'navet-energy-dashboard',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        range: state.range,
        visibleWidgets: state.visibleWidgets,
        sourceConfig: state.sourceConfig,
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
          sourceConfig:
            next.sourceConfig && typeof next.sourceConfig === 'object' ? next.sourceConfig : null,
        };
      },
    }
  )
);
