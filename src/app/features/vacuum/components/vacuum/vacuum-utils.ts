export type VacuumStatus = 'cleaning' | 'returning' | 'docked' | 'paused' | 'idle';
export type VacuumThemeStatus = Exclude<VacuumStatus, 'idle'>;

export interface VacuumProgressMetric {
  labelKey:
    | 'vacuum.status.cleaning'
    | 'vacuum.metric.charging'
    | 'vacuum.metric.fullyCharged'
    | 'vacuum.settings.battery';
  progress: number;
  pulse: boolean;
}

export function getVacuumThemeStatus(status: VacuumStatus): VacuumThemeStatus {
  return status === 'idle' ? 'docked' : status;
}

export function getVacuumStatusText(status: VacuumStatus): string {
  switch (status) {
    case 'cleaning':
      return 'Cleaning';
    case 'returning':
      return 'Returning to dock';
    case 'docked':
      return 'Docked';
    case 'paused':
      return 'Paused';
    default:
      return 'Idle';
  }
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function deriveVacuumProgressMetric({
  status,
  battery,
  cleaningProgress,
}: {
  status: VacuumStatus;
  battery: number;
  cleaningProgress?: number;
}): VacuumProgressMetric {
  if (status === 'cleaning') {
    return {
      labelKey: 'vacuum.status.cleaning',
      progress: clampPercentage(cleaningProgress ?? 0),
      pulse: false,
    };
  }

  if (status === 'docked') {
    if (battery >= 100) {
      return {
        labelKey: 'vacuum.metric.fullyCharged',
        progress: 100,
        pulse: false,
      };
    }

    return {
      labelKey: 'vacuum.metric.charging',
      progress: clampPercentage(battery),
      pulse: true,
    };
  }

  return {
    labelKey: 'vacuum.settings.battery',
    progress: clampPercentage(battery),
    pulse: false,
  };
}

export function getVacuumBatteryGradientClass(battery: number): string {
  if (battery > 60) return 'from-green-500 to-green-600';
  if (battery > 30) return 'from-amber-500 to-amber-600';
  return 'from-red-500 to-red-600';
}
