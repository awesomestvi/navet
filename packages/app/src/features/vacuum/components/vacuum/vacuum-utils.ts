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
export type VacuumThemeStatus = 'cleaning' | 'returning' | 'docked' | 'paused' | 'error';

export type VacuumStatusLabelKey =
  | 'vacuum.status.cleaning'
  | 'vacuum.status.mopping'
  | 'vacuum.status.drying'
  | 'vacuum.status.returning'
  | 'vacuum.status.docked'
  | 'vacuum.status.charging'
  | 'vacuum.status.chargingComplete'
  | 'vacuum.status.paused'
  | 'vacuum.status.error'
  | 'vacuum.status.idle';

export function normalizeVacuumStatus(
  state: unknown,
  fallback: VacuumStatus = 'idle'
): VacuumStatus {
  const normalized =
    typeof state === 'string' ? state.trim().toLowerCase().replace(/\s+/g, '_') : '';

  if (normalized === 'cleaning') return 'cleaning';
  if (normalized === 'mopping' || normalized === 'washing' || normalized === 'washing_mop') {
    return 'mopping';
  }
  if (normalized === 'drying' || normalized === 'mop_drying' || normalized === 'drying_mop') {
    return 'drying';
  }
  if (normalized === 'returning' || normalized === 'returning_home') return 'returning';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'charging') return 'charging';
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

export function getVacuumThemeStatus(status: VacuumStatus): VacuumThemeStatus {
  if (status === 'cleaning' || status === 'mopping') return 'cleaning';
  if (status === 'returning') return 'returning';
  if (status === 'paused') return 'paused';
  if (status === 'error') return 'error';
  return 'docked';
}

export function getVacuumStatusLabelKey(status: VacuumStatus): VacuumStatusLabelKey {
  switch (status) {
    case 'cleaning':
      return 'vacuum.status.cleaning';
    case 'mopping':
      return 'vacuum.status.mopping';
    case 'drying':
      return 'vacuum.status.drying';
    case 'returning':
      return 'vacuum.status.returning';
    case 'docked':
      return 'vacuum.status.docked';
    case 'charging':
      return 'vacuum.status.charging';
    case 'charging-complete':
      return 'vacuum.status.chargingComplete';
    case 'paused':
      return 'vacuum.status.paused';
    case 'error':
      return 'vacuum.status.error';
    default:
      return 'vacuum.status.idle';
  }
}
