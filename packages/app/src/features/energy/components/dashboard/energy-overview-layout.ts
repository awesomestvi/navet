import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { usePersistedState } from '@navet/app/hooks/use-persisted-state';

export type EnergyOverviewModuleId = 'live' | 'devices';
export type EnergyOverviewTemplate = 'essentials' | 'balanced';

export interface EnergyOverviewLayout {
  version?: 2;
  order: EnergyOverviewModuleId[];
  hidden: EnergyOverviewModuleId[];
  sizes: Partial<Record<EnergyOverviewModuleId, 'half' | 'full'>>;
}

export const DEFAULT_ENERGY_OVERVIEW_LAYOUT: EnergyOverviewLayout = {
  version: 2,
  order: ['live', 'devices'],
  hidden: [],
  sizes: {},
};

export function getEnergyOverviewTemplateLayout(
  template: EnergyOverviewTemplate
): EnergyOverviewLayout {
  if (template === 'essentials') {
    return {
      version: 2,
      order: ['live', 'devices'],
      hidden: ['devices'],
      sizes: {},
    };
  }

  return DEFAULT_ENERGY_OVERVIEW_LAYOUT;
}

export function normalizeEnergyOverviewLayout(value: EnergyOverviewLayout): EnergyOverviewLayout {
  const validIds: EnergyOverviewModuleId[] = ['live', 'devices'];
  if (value?.version !== 2) {
    return DEFAULT_ENERGY_OVERVIEW_LAYOUT;
  }
  const order = [
    'live' as const,
    ...(Array.isArray(value?.order)
      ? value.order.filter((id) => id !== 'live' && validIds.includes(id))
      : []),
    ...validIds.filter((id) => id !== 'live'),
  ].filter((id, index, items) => items.indexOf(id) === index);
  const hidden = Array.isArray(value?.hidden)
    ? value.hidden.filter((id) => id !== 'live' && validIds.includes(id))
    : [];
  return { version: 2, order, hidden, sizes: value?.sizes ?? DEFAULT_ENERGY_OVERVIEW_LAYOUT.sizes };
}

export function useEnergyOverviewLayout() {
  return usePersistedState<EnergyOverviewLayout>(
    STORAGE_KEYS.energyOverviewLayout,
    DEFAULT_ENERGY_OVERVIEW_LAYOUT
  );
}
