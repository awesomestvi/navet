import { CardDialogChoicePill } from '@navet/app/components/patterns';
import { Panel } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n } from '@navet/app/hooks';
import { ScanSearch } from 'lucide-react';
import type { CSSProperties } from 'react';
import { SelectablePill } from './vacuum-selectable-pill';

type PlannerView = 'all' | 'rooms' | 'zones';

interface VacuumPlannerSectionProps {
  plannerView: PlannerView;
  onPlannerViewChange: (view: PlannerView) => void;
  roomTargets: string[];
  zoneTargets: string[];
  selectedRooms: string[];
  selectedZones: string[];
  onRoomsChange: (rooms: string[]) => void;
  onZonesChange: (zones: string[]) => void;
  sectionStyle?: CSSProperties;
  activePillStyle?: CSSProperties;
}

export function VacuumPlannerSection({
  plannerView,
  onPlannerViewChange,
  roomTargets,
  zoneTargets,
  selectedRooms,
  selectedZones,
  onRoomsChange,
  onZonesChange,
  sectionStyle,
  activePillStyle,
}: VacuumPlannerSectionProps) {
  const { t } = useI18n();

  const handleRoomSelect = (target: string) => {
    onRoomsChange(
      selectedRooms.includes(target)
        ? selectedRooms.filter((entry) => entry !== target)
        : [...selectedRooms, target]
    );
  };

  const handleZoneSelect = (target: string) => {
    onZonesChange(
      selectedZones.includes(target)
        ? selectedZones.filter((entry) => entry !== target)
        : [...selectedZones, target]
    );
  };

  return (
    <div className="">
      <div className="flex flex-wrap gap-2">
        {(['all', 'rooms', 'zones'] as PlannerView[]).map((view) => (
          <CardDialogChoicePill
            key={view}
            active={plannerView === view}
            onClick={() => onPlannerViewChange(view)}
            size="compact"
            className="min-w-18"
            style={plannerView === view ? activePillStyle : undefined}
          >
            {view === 'all'
              ? t('vacuum.plan.all')
              : view === 'rooms'
                ? t('vacuum.plan.rooms')
                : t('vacuum.plan.zones')}
          </CardDialogChoicePill>
        ))}
      </div>

      {plannerView === 'all' ? (
        <div className="mt-3">
          <Panel className="border-white/10 bg-white/6" style={sectionStyle}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
                <ScanSearch className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-white">
                  {t('vacuum.plan.wholeHome')}
                </div>
                <div className="mt-1 text-sm text-white/76">
                  {roomTargets.length > 0
                    ? `${roomTargets.length} ${t('vacuum.plan.rooms')}`
                    : t('vacuum.plan.mapHint')}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {plannerView === 'rooms' ? (
        <div className="mt-3">
          {roomTargets.length > 0 ? (
            <div
              className={cn('grid gap-2', roomTargets.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}
            >
              {roomTargets.map((target) => (
                <SelectablePill
                  key={target}
                  label={target}
                  active={selectedRooms.includes(target)}
                  style={selectedRooms.includes(target) ? activePillStyle : undefined}
                  onClick={() => handleRoomSelect(target)}
                />
              ))}
            </div>
          ) : (
            <Panel
              className="border-dashed border-white/10 bg-white/4 text-sm text-white/72"
              style={sectionStyle}
            >
              {t('vacuum.plan.mapHint')}
            </Panel>
          )}
        </div>
      ) : null}

      {plannerView === 'zones' ? (
        <div className="mt-3">
          {zoneTargets.length > 0 ? (
            <div
              className={cn('grid gap-2', zoneTargets.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}
            >
              {zoneTargets.map((target) => (
                <SelectablePill
                  key={target}
                  label={target}
                  active={selectedZones.includes(target)}
                  style={selectedZones.includes(target) ? activePillStyle : undefined}
                  onClick={() => handleZoneSelect(target)}
                />
              ))}
            </div>
          ) : (
            <Panel
              className="border-dashed border-white/10 bg-white/4 text-sm text-white/72"
              style={sectionStyle}
            >
              {t('vacuum.plan.mapHint')}
            </Panel>
          )}
        </div>
      ) : null}
    </div>
  );
}
