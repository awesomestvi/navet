import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { VacuumProgressIndicator } from './vacuum-progress-indicator';
import { deriveVacuumProgressMetric, type VacuumStatus } from './vacuum-utils';

interface VacuumStatusDisplayProps {
  currentStatus: VacuumStatus;
  battery: number;
  cleaningProgress?: number;
  room: string;
  theme: ThemeType;
  accentColorValue: string;
  isSmall: boolean;
  isMedium?: boolean;
}

export function VacuumStatusDisplay({
  currentStatus,
  battery,
  cleaningProgress,
  room,
  theme,
  accentColorValue,
  isSmall,
  isMedium = false,
}: VacuumStatusDisplayProps) {
  const { t } = useI18n();
  const progressMetric = deriveVacuumProgressMetric({
    status: currentStatus,
    battery,
    cleaningProgress,
  });
  const progressLabel = t(progressMetric.labelKey);

  return (
    <div className={`flex flex-col ${isMedium ? '' : 'h-full'}`}>
      {isSmall ? (
        <div className="flex flex-1 flex-col justify-end gap-3">
          <VacuumProgressIndicator
            theme={theme}
            accentColorValue={accentColorValue}
            label={progressLabel}
            progress={progressMetric.progress}
            room={room}
            pulse={progressMetric.pulse}
            variant={currentStatus === 'cleaning' ? 'cleaning' : 'battery'}
          />
        </div>
      ) : isMedium ? (
        <div className="flex flex-col gap-3">
          <VacuumProgressIndicator
            theme={theme}
            accentColorValue={accentColorValue}
            label={progressLabel}
            progress={progressMetric.progress}
            room={room}
            pulse={progressMetric.pulse}
            variant={currentStatus === 'cleaning' ? 'cleaning' : 'battery'}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between pt-2">
          <VacuumProgressIndicator
            theme={theme}
            accentColorValue={accentColorValue}
            label={progressLabel}
            progress={progressMetric.progress}
            room={room}
            pulse={progressMetric.pulse}
            variant={currentStatus === 'cleaning' ? 'cleaning' : 'battery'}
          />
        </div>
      )}
    </div>
  );
}
