import { Button, Panel } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import { Pause, Play } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getVacuumStatusLabelKey, type VacuumStatus } from './vacuum-utils';

interface VacuumStatusHeaderProps {
  currentStatus: VacuumStatus;
  plannerSummaryLabel: string;
  cleaningMode: string;
  selectedFanSpeed: string;
  roomTargets: string[];
  plannerView: 'all' | 'rooms' | 'zones';
  primaryActionLabel: string;
  onStartCleaning: () => void;
  onPauseCleaning?: () => void;
  softControlStyle?: CSSProperties;
  statusBadgeStyle?: CSSProperties;
}

function getStatusIntentClassName(status: VacuumStatus) {
  switch (status) {
    case 'cleaning':
    case 'mopping':
      return 'border-white/14 bg-white/10 text-white';
    case 'returning':
      return 'border-amber-400/30 bg-amber-400/14 text-amber-100';
    case 'paused':
      return 'border-yellow-400/30 bg-yellow-400/14 text-yellow-100';
    case 'docked':
    case 'charging':
    case 'charging-complete':
      return 'border-emerald-400/30 bg-emerald-400/14 text-emerald-100';
    case 'error':
      return 'border-red-400/30 bg-red-400/14 text-red-100';
    default:
      return 'border-white/14 bg-white/10 text-white/82';
  }
}

export function VacuumStatusHeader({
  currentStatus,
  plannerSummaryLabel,
  cleaningMode,
  selectedFanSpeed,
  roomTargets,
  plannerView,
  primaryActionLabel,
  onStartCleaning,
  onPauseCleaning,
  softControlStyle,
  statusBadgeStyle,
}: VacuumStatusHeaderProps) {
  const { t } = useI18n();

  const statusSummary = t(getVacuumStatusLabelKey(currentStatus));

  const handleAction = () => {
    if (currentStatus === 'cleaning' || currentStatus === 'mopping') {
      onPauseCleaning?.();
    } else {
      onStartCleaning();
    }
  };

  return (
    <Panel className="border-white/10 bg-white/6 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusIntentClassName(currentStatus)}`}
              style={
                currentStatus === 'cleaning' || currentStatus === 'mopping'
                  ? statusBadgeStyle
                  : undefined
              }
            >
              {statusSummary}
            </div>
            <div className="truncate text-sm font-semibold text-white">{plannerSummaryLabel}</div>
          </div>
          <div className="mt-1 truncate text-sm text-white/76">
            {plannerView === 'all'
              ? `${roomTargets.length || 1} ${t('vacuum.plan.rooms')} · ${selectedFanSpeed}`
              : `${t('vacuum.settings.cleaningMode')} · ${cleaningMode}`}
          </div>
        </div>

        <Button
          iconOnly
          label={primaryActionLabel}
          variant="secondary"
          size="default"
          onClick={handleAction}
          className="h-10 w-10 shrink-0 rounded-xl border-white/12 bg-white/10 text-white hover:bg-white/16"
          style={softControlStyle}
        >
          {currentStatus === 'cleaning' || currentStatus === 'mopping' ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Panel>
  );
}
