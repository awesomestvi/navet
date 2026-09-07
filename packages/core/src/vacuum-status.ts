export type VacuumStatus =
  | 'cleaning'
  | 'mopping'
  | 'drying'
  | 'returning'
  | 'docked'
  | 'charging'
  | 'charging-complete'
  | 'paused'
  | 'idle'
  | 'error';

export function normalizeVacuumStatus(
  state: unknown,
  fallback: VacuumStatus = 'idle'
): VacuumStatus {
  const normalized =
    typeof state === 'string' ? state.trim().toLowerCase().replace(/\s+/g, '_') : '';

  if (normalized === 'cleaning' || normalized === 'mowing') return 'cleaning';
  if (normalized === 'mopping' || normalized === 'washing' || normalized === 'washing_mop') {
    return 'mopping';
  }
  if (normalized === 'drying' || normalized === 'mop_drying' || normalized === 'drying_mop') {
    return 'drying';
  }
  if (normalized === 'returning' || normalized === 'returning_home') return 'returning';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'charging') return 'charging';
  if (normalized === 'sleeping') return 'idle';
  if (
    normalized === 'charged' ||
    normalized === 'fully_charged' ||
    normalized === 'charging_complete'
  ) {
    return 'charging-complete';
  }
  if (normalized === 'docked') return 'docked';
  if (normalized === 'error' || normalized === 'fault') return 'error';
  if (normalized === 'idle') return 'idle';
  return fallback;
}
