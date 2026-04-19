import {
  Battery,
  Home,
  type LucideIcon,
  Palette,
  Pause,
  Play,
  ScanSearch,
  Sliders,
  Sparkles,
  Wind,
} from 'lucide-react';
import { type CSSProperties, memo, useEffect, useMemo, useState } from 'react';
import {
  CardDialogChoicePill,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import {
  Button,
  DialogDoneFooter,
  DialogShell,
  InteractivePill,
  Panel,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@/app/components/shared/device-editor';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';
import { getVacuumSettingsDialogSurface } from './vacuum-settings-dialog-surface';
import type { VacuumStatus } from './vacuum-utils';

type PlannerView = 'all' | 'rooms' | 'zones';
type CleaningMode = 'auto' | 'spot' | 'edge' | 'room';

interface VacuumSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartCleaning: () => void;
  onPauseCleaning?: () => void;
  onReturnHome: () => void;
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
  availableRooms?: string[];
  availableZones?: string[];
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  surfaceGradientClassName?: string;
  surfaceBorderClassName?: string;
  surfaceBackdropClassName?: string;
  surfaceStateClassName?: string;
  surfaceGlowClassName?: string;
  surfaceOverlayClassName?: string;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  className,
  style,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('rounded-2xl border border-white/10 bg-white/6 p-3', className)}
      style={style}
    >
      <div className="flex items-center gap-2 text-white/55">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function SelectablePill({
  label,
  description,
  active,
  onClick,
  style,
}: {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <InteractivePill
      onClick={onClick}
      active={active}
      intent="navigation"
      variant="default"
      className="min-h-18 w-full items-start justify-start rounded-2xl px-4 py-3 text-left"
      style={style}
    >
      <div className="text-sm font-semibold">{label}</div>
      {description ? <div className="mt-1 text-xs text-white/55">{description}</div> : null}
    </InteractivePill>
  );
}

function getStatusSummary(status: VacuumStatus, t: ReturnType<typeof useI18n>['t']) {
  switch (status) {
    case 'cleaning':
      return t('vacuum.status.cleaning');
    case 'returning':
      return t('vacuum.status.returning');
    case 'docked':
      return t('vacuum.status.docked');
    case 'paused':
      return t('vacuum.status.paused');
    default:
      return t('vacuum.status.idle');
  }
}

function getStatusIntentClassName(status: VacuumStatus) {
  switch (status) {
    case 'cleaning':
      return 'border-cyan-400/30 bg-cyan-400/14 text-cyan-100';
    case 'returning':
      return 'border-amber-400/30 bg-amber-400/14 text-amber-100';
    case 'paused':
      return 'border-yellow-400/30 bg-yellow-400/14 text-yellow-100';
    case 'docked':
      return 'border-emerald-400/30 bg-emerald-400/14 text-emerald-100';
    default:
      return 'border-white/14 bg-white/10 text-white/82';
  }
}

export const VacuumSettingsDialog = memo(function VacuumSettingsDialog({
  entityId,
  isOpen,
  onClose,
  onStartCleaning,
  onPauseCleaning,
  onReturnHome,
  name,
  room,
  theme,
  accentColorValue,
  currentStatus = 'idle',
  battery = 0,
  cleanedArea = '0 m²',
  cleaningTime = '0 min',
  cleaningMode = 'auto',
  fanSpeed,
  fanSpeeds,
  availableRooms,
  availableZones,
  tintColor,
  onTintColorChange,
  surfaceGradientClassName,
  surfaceBorderClassName,
  surfaceBackdropClassName,
  surfaceStateClassName,
  surfaceGlowClassName,
  surfaceOverlayClassName,
}: VacuumSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const dialogSurface = getVacuumSettingsDialogSurface(theme, currentStatus);
  const isActive = currentStatus === 'cleaning' || currentStatus === 'returning';
  const isOn = theme !== 'light';
  const roomTargets = useMemo(
    () => (availableRooms?.length ? availableRooms : room && room !== 'Whole Home' ? [room] : []),
    [availableRooms, room]
  );
  const zoneTargets = availableZones ?? [];
  const speedOptions = useMemo(
    () =>
      fanSpeeds?.length
        ? fanSpeeds
        : [t('vacuum.speed.quiet'), t('vacuum.speed.standard'), t('vacuum.speed.max')],
    [fanSpeeds, t]
  );
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

  const statusSummary = getStatusSummary(currentStatus, t);
  const selectedTargetCount =
    plannerView === 'rooms'
      ? selectedRooms.length
      : plannerView === 'zones'
        ? selectedZones.length
        : roomTargets.length;

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
    fanSpeed,
    initialPlannerView,
    isOpen,
    roomTargets,
    speedOptions,
    tintColor,
    zoneTargets,
  ]);

  const primaryActionLabel =
    currentStatus === 'cleaning' ? t('vacuum.action.pause') : t('vacuum.action.startCleaning');
  const plannerSummaryLabel =
    plannerView === 'all'
      ? t('vacuum.plan.wholeHome')
      : plannerView === 'rooms'
        ? `${selectedTargetCount} ${t('vacuum.plan.rooms')}`
        : `${selectedTargetCount} ${t('vacuum.plan.zones')}`;
  const cleaningModes: CleaningMode[] = ['auto', 'spot', 'edge', 'room'];
  const resolvedTintColor =
    normalizeCustomCardTint(tintColor) ?? normalizeCustomCardTint(localTintColor);
  const tintSurface = getCustomCardTintSurface(theme, resolvedTintColor);
  const sectionStyle = getInheritedDialogSectionStyle(theme, resolvedTintColor, accentColorValue);
  const activeControlColor = resolvedTintColor ?? accentColorValue;
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
    <DialogShell
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={cn(
        'fixed top-1/2 left-1/2 z-50 h-auto max-h-[88vh] w-[92vw] max-w-[42rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] border shadow-2xl backdrop-blur-xl',
        surfaceGradientClassName
          ? `bg-gradient-to-br ${surfaceGradientClassName}`
          : dialogSurface.contentClassName,
        surfaceBackdropClassName,
        surfaceStateClassName,
        surfaceBorderClassName ?? dialogSurface.contentBorderClassName
      )}
      contentStyle={tintSurface.panelStyle}
      contentGlowClassName={
        surfaceGlowClassName
          ? `bg-gradient-to-br ${surfaceGlowClassName} to-transparent`
          : dialogSurface.contentGlowClassName
            ? `bg-gradient-to-br ${dialogSurface.contentGlowClassName} to-transparent`
            : undefined
      }
      contentGlowStyle={tintSurface.glowStyle}
      contentOverlayClassName={surfaceOverlayClassName ?? tintSurface.overlayClassName ?? undefined}
    >
      <CustomScrollbar isOn={isActive}>
        <div className="p-6">
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                Customize
              </CardDialogTabTrigger>
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-6">
              {/* Status summary */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                      getStatusIntentClassName(currentStatus)
                    )}
                  >
                    {statusSummary}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {plannerSummaryLabel}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {plannerView === 'all'
                      ? `${roomTargets.length || 1} ${t('vacuum.plan.rooms')} · ${selectedFanSpeed}`
                      : `${t('vacuum.settings.cleaningMode')} · ${t(`vacuum.mode.${selectedCleaningMode}`)}`}
                  </div>
                </div>

                <Button
                  iconOnly
                  label={primaryActionLabel}
                  variant="secondary"
                  size="medium"
                  onClick={
                    currentStatus === 'cleaning'
                      ? (onPauseCleaning ?? onStartCleaning)
                      : onStartCleaning
                  }
                  className="h-12 w-12 rounded-2xl border-white/12 bg-white/10 text-white hover:bg-white/16"
                  style={softControlStyle}
                >
                  {currentStatus === 'cleaning' ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MetricCard
                  icon={Battery}
                  label={t('vacuum.settings.battery')}
                  value={`${battery}%`}
                  className="bg-white/7"
                  style={sectionStyle}
                />
                <MetricCard
                  icon={Sparkles}
                  label={t('vacuum.cleanedArea')}
                  value={cleanedArea}
                  className="bg-white/7"
                  style={sectionStyle}
                />
                <MetricCard
                  icon={Wind}
                  label={t('vacuum.cleaningTime')}
                  value={cleaningTime}
                  className="bg-white/7"
                  style={sectionStyle}
                />
              </div>

              <CardDialogSection label={t('vacuum.settings.plan')}>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['all', 'rooms', 'zones'] as PlannerView[]).map((view) => (
                    <CardDialogChoicePill
                      key={view}
                      active={plannerView === view}
                      onClick={() => setPlannerView(view)}
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
                          <div className="mt-1 text-sm text-white/60">
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
                      <div className="grid grid-cols-2 gap-2">
                        {roomTargets.map((target) => {
                          const active = selectedRooms.includes(target);

                          return (
                            <SelectablePill
                              key={target}
                              label={target}
                              active={active}
                              style={active ? activePillStyle : undefined}
                              onClick={() =>
                                setSelectedRooms((current) =>
                                  current.includes(target)
                                    ? current.filter((entry) => entry !== target)
                                    : [...current, target]
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <Panel
                        className="border-dashed border-white/10 bg-white/4 text-sm text-white/55"
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
                      <div className="grid grid-cols-2 gap-2">
                        {zoneTargets.map((target) => {
                          const active = selectedZones.includes(target);

                          return (
                            <SelectablePill
                              key={target}
                              label={target}
                              active={active}
                              style={active ? activePillStyle : undefined}
                              onClick={() =>
                                setSelectedZones((current) =>
                                  current.includes(target)
                                    ? current.filter((entry) => entry !== target)
                                    : [...current, target]
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <Panel
                        className="border-dashed border-white/10 bg-white/4 text-sm text-white/55"
                        style={sectionStyle}
                      >
                        {t('vacuum.plan.mapHint')}
                      </Panel>
                    )}
                  </div>
                ) : null}
              </CardDialogSection>

              <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                <CardDialogSection label={t('vacuum.settings.profile')}>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cleaningModes.map((mode) => (
                      <CardDialogChoicePill
                        key={mode}
                        active={selectedCleaningMode === mode}
                        onClick={() => setSelectedCleaningMode(mode)}
                        style={selectedCleaningMode === mode ? activePillStyle : undefined}
                      >
                        {t(`vacuum.mode.${mode}`)}
                      </CardDialogChoicePill>
                    ))}
                  </div>
                </CardDialogSection>

                <CardDialogSection label={t('vacuum.settings.fanSpeed')}>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {speedOptions.map((speed) => (
                      <CardDialogChoicePill
                        key={speed}
                        active={selectedFanSpeed === speed}
                        onClick={() => setSelectedFanSpeed(speed)}
                        style={selectedFanSpeed === speed ? activePillStyle : undefined}
                      >
                        {speed}
                      </CardDialogChoicePill>
                    ))}
                  </div>
                </CardDialogSection>
              </div>

              <CardDialogSection label={t('vacuum.settings.actions')}>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="primary"
                    size="medium"
                    leading={
                      currentStatus === 'cleaning' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )
                    }
                    onClick={
                      currentStatus === 'cleaning'
                        ? (onPauseCleaning ?? onStartCleaning)
                        : onStartCleaning
                    }
                    style={{ backgroundColor: activeControlColor }}
                  >
                    {primaryActionLabel}
                  </Button>

                  <Button
                    variant="secondary"
                    size="medium"
                    leading={<Home className="h-4 w-4" />}
                    onClick={onReturnHome}
                    className={cn(
                      theme !== 'light' ? 'border-white/10 bg-white/8 hover:bg-white/12' : ''
                    )}
                    style={softControlStyle}
                  >
                    {t('vacuum.action.returnToDock')}
                  </Button>
                </div>
              </CardDialogSection>
            </TabPanel>

            <TabPanel value="card" className="mt-5">
              <CustomCardTintPicker
                value={resolvedTintColor}
                onChange={handleTintChange}
                isOn={isOn}
                defaultColor={accentColorValue}
              />
            </TabPanel>
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});
