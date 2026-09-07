import { parseProviderScopedId } from '@navet/app/utils/provider-ids';

import type { VacuumStatus } from '@navet/core/vacuum-status';

export { normalizeVacuumStatus, type VacuumStatus } from '@navet/core/vacuum-status';

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
  | 'vacuum.status.idle'
  | 'lawnMower.status.mowing';

export function getVacuumThemeStatus(status: VacuumStatus): VacuumThemeStatus {
  if (status === 'cleaning' || status === 'mopping') return 'cleaning';
  if (status === 'returning') return 'returning';
  if (status === 'paused') return 'paused';
  if (status === 'error') return 'error';
  return 'docked';
}

export function isLawnMowerEntityId(entityId: string | undefined): boolean {
  if (typeof entityId !== 'string') {
    return false;
  }

  const nativeEntityId = parseProviderScopedId(entityId)?.nativeId ?? entityId;
  return nativeEntityId.startsWith('lawn_mower.');
}

export function getVacuumStatusLabelKey(
  status: VacuumStatus,
  options: { isLawnMower?: boolean } = {}
): VacuumStatusLabelKey {
  switch (status) {
    case 'cleaning':
      return options.isLawnMower ? 'lawnMower.status.mowing' : 'vacuum.status.cleaning';
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
