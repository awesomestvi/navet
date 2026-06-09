import {
  CardDialogBody,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { DialogDoneFooter, ModalSurface } from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@navet/app/components/shared/device-editor';
import {
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { Palette, Sliders } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { VacuumCleaningControls } from './vacuum-cleaning-controls';
import { VacuumPlannerSection } from './vacuum-planner-section';
import { VacuumStatusHeader } from './vacuum-status-header';
import { VacuumStatusMetrics } from './vacuum-status-metrics';
import type { VacuumStatus } from './vacuum-utils';

type PlannerView = 'all' | 'rooms' | 'zones';
type CleaningMode = 'auto' | 'spot' | 'edge' | 'room';

const EMPTY_TARGETS: string[] = [];
const DEFAULT_VACUUM_ACCENT_COLOR = '#06b6d4';

interface VacuumSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartCleaning: () => void;
  onPauseCleaning?: () => void;
  onStopCleaning?: () => void;
  onReturnHome: () => void;
  onSetFanSpeed?: (fanSpeed: string) => void;
  name: string;
  room: string;
  theme: ThemeType;
  accentColorValue: string;
  currentStatus?: VacuumStatus;
  battery?: number;
  cleanedArea?: string;
  cleaningTime?: string;
  cleaningMode?: CleaningMode;
  fanSpeed?: string;
  fanSpeeds?: string[];
  supportsFanSpeed?: boolean;
  isUpdatingFanSpeed?: boolean;
  capabilities?: import('./vacuum-features').VacuumCapabilities;
  availableRooms?: string[];
  availableZones?: string[];
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export const VacuumSettingsDialog = memo(function VacuumSettingsDialog({
  entityId,
  isOpen,
  onClose,
  onStartCleaning,
  onPauseCleaning,
  onStopCleaning,
  onReturnHome,
  onSetFanSpeed,
  name,
  room,
  theme,
  accentColorValue,
  currentStatus = 'idle',
  battery,
  cleanedArea,
  cleaningTime,
  cleaningMode = 'auto',
  fanSpeed,
  fanSpeeds,
  supportsFanSpeed = true,
  isUpdatingFanSpeed = false,
  capabilities,
  availableRooms,
  availableZones,
  tintColor,
  onTintColorChange,
}: VacuumSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const isActive =
    currentStatus === 'cleaning' || currentStatus === 'mopping' || currentStatus === 'returning';
  const roomTargets = useMemo(
    () => (availableRooms?.length ? availableRooms : room && room !== 'Whole Home' ? [room] : []),
    [availableRooms, room]
  );
  const zoneTargets = useMemo(
    () => (availableZones?.length ? availableZones : EMPTY_TARGETS),
    [availableZones]
  );
  const speedOptions = useMemo(() => {
    if (!supportsFanSpeed) {
      return [];
    }

    return fanSpeeds?.length
      ? fanSpeeds
      : [t('vacuum.speed.quiet'), t('vacuum.speed.standard'), t('vacuum.speed.max')];
  }, [fanSpeeds, supportsFanSpeed, t]);
  const initialPlannerView = useMemo<PlannerView>(
    () => (roomTargets.length > 0 ? 'rooms' : zoneTargets.length > 0 ? 'zones' : 'all'),
    [roomTargets.length, zoneTargets.length]
  );
  const [plannerView, setPlannerView] = useState<PlannerView>(initialPlannerView);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(
    roomTargets[0] ? [roomTargets[0]] : []
  );
  const [selectedZones, setSelectedZones] = useState<string[]>(
    zoneTargets[0] ? [zoneTargets[0]] : []
  );
  const [selectedCleaningMode, setSelectedCleaningMode] = useState<CleaningMode>(cleaningMode);
  const [selectedFanSpeed, setSelectedFanSpeed] = useState<string>(
    fanSpeed ?? speedOptions[1] ?? speedOptions[0] ?? ''
  );
  const [localTintColor, setLocalTintColor] = useState<string>(tintColor ?? accentColorValue);
  const [activeTab, setActiveTab] = useState('controls');

  const selectedTargetCount =
    plannerView === 'rooms'
      ? selectedRooms.length
      : plannerView === 'zones'
        ? selectedZones.length
        : roomTargets.length;

  useEffect(() => {
    setSelectedFanSpeed(fanSpeed ?? speedOptions[1] ?? speedOptions[0] ?? '');
  }, [fanSpeed, speedOptions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPlannerView(initialPlannerView);
    setSelectedRooms(roomTargets[0] ? [roomTargets[0]] : []);
    setSelectedZones(zoneTargets[0] ? [zoneTargets[0]] : []);
    setSelectedCleaningMode(cleaningMode);
    setSelectedFanSpeed(fanSpeed ?? speedOptions[1] ?? speedOptions[0] ?? '');
    setLocalTintColor(tintColor ?? accentColorValue);
  }, [
    accentColorValue,
    cleaningMode,
    initialPlannerView,
    isOpen,
    roomTargets,
    speedOptions,
    tintColor,
    zoneTargets,
  ]);

  const primaryActionLabel =
    currentStatus === 'cleaning' || currentStatus === 'mopping'
      ? capabilities?.canStop
        ? t('vacuum.action.stop')
        : t('vacuum.action.pause')
      : t('vacuum.action.startCleaning');
  const formatTargetCount = (count: number) =>
    `${count} ${count === 1 ? t('vacuum.settings.room') : t('vacuum.plan.rooms')}`;
  const plannerSummaryLabel =
    plannerView === 'all'
      ? t('vacuum.plan.wholeHome')
      : plannerView === 'rooms'
        ? formatTargetCount(selectedTargetCount)
        : `${selectedTargetCount} ${t('vacuum.plan.zones')}`;
  const resolvedTintColor =
    normalizeCustomCardTint(tintColor) ?? normalizeCustomCardTint(localTintColor);
  const sectionStyle = getInheritedDialogSectionStyle(theme, resolvedTintColor, accentColorValue);
  const activeControlColor =
    resolvedTintColor ?? normalizeCustomCardTint(accentColorValue) ?? DEFAULT_VACUUM_ACCENT_COLOR;
  const activePillStyle = activeControlColor
    ? {
        backgroundColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.14 : 0.18),
        borderColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.24 : 0.34),
        boxShadow: `inset 0 0 0 1px ${withTintAlpha(activeControlColor, theme === 'light' ? 0.14 : 0.2)}`,
      }
    : sectionStyle;
  const softControlStyle = activeControlColor
    ? {
        backgroundColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.08 : 0.12),
        borderColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.16 : 0.22),
      }
    : sectionStyle;

  const handleTintChange = (color: string) => {
    setLocalTintColor(color);
    onTintColorChange?.(color);
  };

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={name}
      description={entityType}
      disableOpenAutoFocus
      bodyClassName="p-6 max-sm:px-3.5 max-sm:pt-2 max-sm:pb-3"
      overlayClassName={surface.dialogBackdrop}
      contentClassName="h-auto max-h-[85vh] max-w-md"
    >
      <CustomScrollbar isOn={isActive} className="max-sm:min-h-0 max-sm:flex-1">
        <CardDialogBody className="p-0">
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                {t('common.controls')}
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                {t('common.customize')}
              </CardDialogTabTrigger>
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-5">
              <VacuumStatusHeader
                currentStatus={currentStatus}
                plannerSummaryLabel={plannerSummaryLabel}
                cleaningMode={selectedCleaningMode}
                selectedFanSpeed={selectedFanSpeed}
                roomTargets={roomTargets}
                plannerView={plannerView}
                primaryActionLabel={primaryActionLabel}
                onStartCleaning={onStartCleaning}
                onPauseCleaning={onPauseCleaning}
                softControlStyle={softControlStyle ?? undefined}
                statusBadgeStyle={activePillStyle ?? undefined}
              />

              <VacuumStatusMetrics
                battery={battery}
                cleanedArea={cleanedArea}
                cleaningTime={cleaningTime}
                sectionStyle={sectionStyle ?? undefined}
              />

              <CardDialogSection label={t('vacuum.settings.plan')} className="mb-0">
                <VacuumPlannerSection
                  plannerView={plannerView}
                  onPlannerViewChange={setPlannerView}
                  roomTargets={roomTargets}
                  zoneTargets={zoneTargets}
                  selectedRooms={selectedRooms}
                  selectedZones={selectedZones}
                  onRoomsChange={setSelectedRooms}
                  onZonesChange={setSelectedZones}
                  sectionStyle={sectionStyle ?? undefined}
                  activePillStyle={activePillStyle ?? undefined}
                />
              </CardDialogSection>

              <VacuumCleaningControls
                cleaningMode={selectedCleaningMode}
                onCleaningModeChange={setSelectedCleaningMode}
                fanSpeed={selectedFanSpeed}
                onFanSpeedChange={(speed) => {
                  setSelectedFanSpeed(speed);
                  onSetFanSpeed?.(speed);
                }}
                fanSpeedOptions={speedOptions}
                supportsFanSpeed={supportsFanSpeed}
                isUpdatingFanSpeed={isUpdatingFanSpeed}
                currentStatus={currentStatus}
                onStartCleaning={onStartCleaning}
                onPauseCleaning={onPauseCleaning}
                onStopCleaning={onStopCleaning}
                onReturnHome={onReturnHome}
                capabilities={capabilities}
                activePillStyle={activePillStyle}
                softControlStyle={softControlStyle}
                activeControlColor={activeControlColor}
                theme={theme}
              />
            </TabPanel>

            <TabPanel value="card" className="mt-5">
              <CustomCardTintPicker
                value={resolvedTintColor}
                onChange={handleTintChange}
                isOn={theme !== 'light'}
                defaultColor={accentColorValue}
              />
            </TabPanel>
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </ModalSurface>
  );
});
