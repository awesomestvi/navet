import { dispatchEntityCommand } from '@navet/app/commands';
import { DashboardEmptyState } from '@navet/app/components/patterns';
import { BaseCard, Button } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { CardEditActionButton } from '@navet/app/components/shared/card-edit-action-button';
import { getEnergyChartSurfaceTokens } from '@navet/app/components/shared/theme/energy-widget-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { LightCard } from '@navet/app/features/lighting/components/light-card';
import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import type { QuickActionRoutine } from '@navet/app/features/tasks/types';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useProviderEntityModels } from '@navet/app/hooks/use-provider-device';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { darkenColor } from '@navet/app/utils/color-utils';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Lightbulb,
  LoaderCircle,
  Power,
  Sparkles,
  X,
} from 'lucide-react';
import { type CSSProperties, memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type LightBatchActionResult, setLightsPower } from './light-dashboard-actions';
import {
  buildLightDashboardModel,
  type LightDashboardItem,
  type LightDashboardModel,
  type LightRoomSummary,
} from './light-dashboard-model';

interface LightsDashboardProps {
  deviceMap: Map<string, DeviceWithType>;
  rooms: string[];
  cardOrders: Record<string, string[]>;
  scenes: QuickActionRoutine[];
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}

function showBatchIssue(result: LightBatchActionResult, t: ReturnType<typeof useI18n>['t']) {
  if (result.failed === 0 && result.skippedUnavailable === 0) return;

  const message = t('lighting.dashboard.actionPartial', {
    succeeded: result.succeeded,
    failed: result.failed,
    unavailable: result.skippedUnavailable,
  });
  if (result.failed > 0) toast.error(message);
  else toast.warning(message);
}

const keepCompactLightCardSize = () => {};
const RoomLightCard = memo(function RoomLightCard({
  light,
  isEditMode,
  onRemoveEntity,
}: {
  light: LightDashboardItem;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const separatorClassName = getEnergyChartSurfaceTokens(theme).axisLineColor;

  return (
    <div
      className={`relative min-w-0 border-b border-dashed last:border-b-0 ${separatorClassName} ${
        isEditMode ? 'pr-10' : 'pr-2'
      }`}
      data-light-state={light.available ? (light.isOn ? 'on' : 'off') : 'unavailable'}
    >
      {light.available ? (
        <LightCard
          id={light.id}
          name={light.name}
          room={light.room}
          providerId={light.providerId}
          initialState={light.isOn}
          initialBrightness={light.brightness ?? 0}
          initialTemp={light.colorTemperatureKelvin ?? 4000}
          size="extra-small"
          onSizeChange={keepCompactLightCardSize}
          isEditMode={isEditMode}
          cardTapAction="controls"
          presentation="table-row"
        />
      ) : (
        <div className="flex min-h-12 items-center gap-3 py-1">
          <div className="-ml-[5px] flex h-11 w-11 shrink-0 items-center justify-center">
            <CircleAlert
              className={`h-4 w-4 ${theme === 'light' ? 'text-red-600' : 'text-red-300'}`}
              aria-hidden="true"
            />
          </div>
          <span
            className={`-ml-[3px] min-w-0 flex-1 truncate text-sm font-medium ${
              theme === 'light' ? 'text-red-700' : 'text-red-200'
            }`}
          >
            {light.name}
          </span>
          <span
            className={`shrink-0 text-xs ${theme === 'light' ? 'text-red-600' : 'text-red-300'}`}
          >
            {t('lighting.dashboard.unavailable')}
          </span>
        </div>
      )}

      {isEditMode && onRemoveEntity ? (
        <CardEditActionButton
          cardSize="extra-small"
          Icon={X}
          theme={theme}
          variant="destructive"
          aria-label={t('dashboard.edit.removeEntityFromDashboard')}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveEntity(light.id);
          }}
        />
      ) : null}
    </div>
  );
});

const LightsRoomSection = memo(function LightsRoomSection({
  room,
  expanded,
  onExpandedChange,
  onPower,
  powerPending,
  actionsDisabled,
  isEditMode,
  onRemoveEntity,
}: {
  room: LightRoomSummary;
  expanded: boolean;
  onExpandedChange: (room: string, expanded: boolean) => void;
  onPower: (room: LightRoomSummary) => void;
  powerPending: boolean;
  actionsDisabled: boolean;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const separatorClassName = getEnergyChartSurfaceTokens(theme).axisLineColor;
  const displayName =
    room.room === UNKNOWN_ROOM_LABEL ? t('lighting.dashboard.otherLights') : room.room;
  const availableCount = room.totalCount - room.unavailableCount;
  const allUnavailable = availableCount === 0;

  const roomStateParts = [
    allUnavailable
      ? t('lighting.dashboard.roomUnavailable')
      : t('lighting.dashboard.roomState', {
          active: room.activeCount,
          total: room.totalCount,
        }),
  ];
  if (!allUnavailable && typeof room.averageBrightness === 'number') {
    roomStateParts.push(
      t('lighting.dashboard.averageBrightness', { brightness: room.averageBrightness })
    );
  }
  if (room.unavailableCount > 0) {
    roomStateParts.push(t('lighting.dashboard.unavailableCount', { count: room.unavailableCount }));
  }
  const roomStateSummary = roomStateParts.join(' · ');
  const roomSummary = `${displayName}, ${roomStateSummary}`;
  const roomPowerLabel = t(
    room.activeCount > 0
      ? 'lighting.dashboard.turnRoomOffAria'
      : 'lighting.dashboard.turnRoomOnAria',
    { room: displayName }
  );

  return (
    <section
      aria-label={roomSummary}
      className="ios-pwa-scroll-repaint min-h-0"
      data-lights-room-section
    >
      <BaseCard
        size="large"
        title={displayName}
        subtitle={roomStateSummary}
        headerLayout="title-first"
        headerVariant="large"
        accentColor={accentColor}
        headerMarginBottomClassName={expanded ? undefined : 'mb-0'}
        headerLeading={
          <EntityCardHeaderIcon
            IconComponent={powerPending ? LoaderCircle : Lightbulb}
            isActive={room.activeCount > 0}
            size="large"
            tone={room.activeCount > 0 ? 'primary' : 'neutral'}
            baseColor={accentColor}
            variant="large"
            ariaLabel={roomPowerLabel}
            ariaPressed={room.activeCount > 0}
            disabled={allUnavailable || isEditMode || actionsDisabled}
            onClick={() => onPower(room)}
            badgeClassName="min-h-9 min-w-9 disabled:cursor-not-allowed disabled:opacity-50"
            glyphClassName={powerPending ? 'motion-safe:animate-spin' : undefined}
          />
        }
        surfaceVariant={room.activeCount === 0 ? 'muted' : 'default'}
        headerTrailing={
          <RoundControlButton
            theme={theme}
            size="large"
            variant="neutral"
            onClick={() => onExpandedChange(room.room, !expanded)}
            aria-expanded={expanded}
            data-lights-room-toggle="true"
            aria-label={t('lighting.dashboard.detailsDescription', { name: displayName })}
            title={t('lighting.dashboard.detailsDescription', { name: displayName })}
            className="min-h-9 min-w-9"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </RoundControlButton>
        }
      >
        {expanded ? (
          <div className="flex h-full min-h-0 flex-col">
            <div
              className={`border-t ${separatorClassName}`}
              data-testid={`lights-room-grid-${room.room}`}
            >
              {room.lights.map((light) => (
                <RoomLightCard
                  key={light.id}
                  light={light}
                  isEditMode={isEditMode}
                  onRemoveEntity={onRemoveEntity}
                />
              ))}
            </div>
          </div>
        ) : null}
      </BaseCard>
    </section>
  );
});

export const LightsDashboard = memo(function LightsDashboard({
  deviceMap,
  rooms,
  cardOrders,
  scenes,
  isEditMode,
  onRemoveEntity,
}: LightsDashboardProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const breakpointCols = useBreakpointCols();
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
  const sceneChipClassName =
    theme === 'light'
      ? 'border-slate-200/70 bg-white/55 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)] hover:bg-white/75'
      : theme === 'black'
        ? 'border-white/10 bg-white/[0.035] text-white/88 hover:bg-white/[0.065]'
        : 'border-white/10 bg-white/[0.055] text-white/88 backdrop-blur-xl hover:bg-white/[0.085]';
  const sceneIconColor = theme === 'light' ? darkenColor(accentColor, 68) : accentColor;
  const lightEntityIds = useMemo(
    () =>
      Array.from(deviceMap.values())
        .filter((device) => device.type === 'lights')
        .map((device) => device.id),
    [deviceMap]
  );
  const entities = useProviderEntityModels(lightEntityIds);
  const modelRef = useRef<LightDashboardModel | undefined>(undefined);
  const model = useMemo(() => {
    const next = buildLightDashboardModel({
      deviceMap,
      entities,
      rooms,
      cardOrders,
      previous: modelRef.current,
    });
    modelRef.current = next;
    return next;
  }, [cardOrders, deviceMap, entities, rooms]);
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [pendingBatch, setPendingBatch] = useState<'all' | string | null>(null);
  const [runningSceneId, setRunningSceneId] = useState<string | null>(null);
  const actionPendingRef = useRef(false);
  const allLights = useMemo(() => model.rooms.flatMap((room) => room.lights), [model.rooms]);
  const actionPending = pendingBatch !== null || runningSceneId !== null;
  const summaryItems = useMemo<HomeStatusSummaryItem[]>(() => {
    const items: HomeStatusSummaryItem[] = [
      {
        id: 'lights-on',
        title: t('lighting.dashboard.title'),
        value: t('lighting.dashboard.summary', {
          active: model.activeCount,
          total: model.totalCount,
          rooms: model.activeRoomCount,
        }),
        icon: Lightbulb,
        iconColor: '#facc15',
        tone: 'neutral',
      },
    ];

    if (model.unavailableCount > 0) {
      items.push({
        id: 'unavailable-lights',
        title: t('lighting.dashboard.unavailable'),
        value: t('lighting.dashboard.unavailableCount', { count: model.unavailableCount }),
        icon: CircleAlert,
        iconColor: '#f59e0b',
        tone: 'warning',
      });
    }

    return items;
  }, [model.activeCount, model.activeRoomCount, model.totalCount, model.unavailableCount, t]);
  const displayRooms = useMemo(
    () =>
      model.rooms
        .map((room, index) => ({ room, index }))
        .sort((left, right) => {
          const priority = (room: LightRoomSummary) =>
            room.unavailableCount > 0 ? 0 : room.activeCount > 0 ? 1 : 2;
          return priority(left.room) - priority(right.room) || left.index - right.index;
        })
        .map(({ room }) => room),
    [model.rooms]
  );
  const handleExpandedChange = useCallback((roomName: string, expanded: boolean) => {
    setExpandedRooms((current) => ({ ...current, [roomName]: expanded }));
  }, []);

  const handleWholeHomePower = async () => {
    if (actionPendingRef.current || model.activeCount === 0) return;
    actionPendingRef.current = true;
    setPendingBatch('all');
    try {
      const result = await setLightsPower(
        allLights.filter((light) => light.isOn && light.available && light.supportsToggle),
        'off'
      );
      showBatchIssue(result, t);
    } finally {
      actionPendingRef.current = false;
      setPendingBatch(null);
    }
  };

  const handleRoomPower = useCallback(
    async (room: LightRoomSummary) => {
      if (actionPendingRef.current) return;
      actionPendingRef.current = true;
      setPendingBatch(room.room);
      try {
        showBatchIssue(await setLightsPower(room.lights, room.activeCount > 0 ? 'off' : 'on'), t);
      } finally {
        actionPendingRef.current = false;
        setPendingBatch(null);
      }
    },
    [t]
  );

  const runScene = async (scene: QuickActionRoutine) => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setRunningSceneId(scene.id);
    try {
      const result = await dispatchEntityCommand({ type: 'turn_on', entityId: scene.id });
      if (!result.accepted) throw new Error(result.error);
    } catch {
      toast.error(t('scene.activateFailed'));
    } finally {
      actionPendingRef.current = false;
      setRunningSceneId(null);
    }
  };

  return (
    <SummaryBarStack data-testid="lights-dashboard">
      <SummaryBar
        items={summaryItems}
        className="ios-pwa-scroll-repaint"
        ariaLabel={t('lighting.dashboard.summary', {
          active: model.activeCount,
          rooms: model.activeRoomCount,
          total: model.totalCount,
        })}
        trailingContent={
          <>
            {scenes.length > 0 ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    disabled={actionPending}
                    onClick={() => void runScene(scene)}
                    data-lights-scene={scene.id}
                    className={cn(
                      'group inline-grid h-8 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 rounded-full border px-1.5 py-1 pr-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:gap-1.5 md:px-2 md:py-1.5 md:pr-3',
                      sceneChipClassName,
                      getThemeFocusRingClassName(theme)
                    )}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/10 bg-current/[0.08] transition-transform group-hover:scale-[1.03] md:h-6 md:w-6"
                      style={{ color: sceneIconColor }}
                      aria-hidden="true"
                    >
                      <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </span>
                    <span className="max-w-[8rem] truncate text-[10px] font-semibold leading-3 tracking-normal md:max-w-[10rem] md:text-[11px] md:leading-3.5">
                      {scene.name}
                      {runningSceneId === scene.id ? '…' : ''}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {model.activeCount > 0 ? (
              <div className="ml-auto flex shrink-0 items-center">
                <Button
                  variant="secondary"
                  size="compact"
                  leading={<Power className="h-4 w-4" aria-hidden="true" />}
                  loading={pendingBatch === 'all'}
                  disabled={actionPending || isEditMode}
                  onClick={() => void handleWholeHomePower()}
                  data-lights-whole-home-power="true"
                  className="h-9 shrink-0"
                >
                  {t('lighting.dashboard.turnOffAllLights')}
                </Button>
              </div>
            ) : null}
          </>
        }
      />

      {displayRooms.length > 0 ? (
        <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
          <div
            ref={innerRef}
            className={cn('w-full', isAutoScaled && 'absolute left-0 top-0 origin-top-left')}
            style={innerContainerStyle}
          >
            <div
              className="grid w-full grid-flow-row-dense items-start gap-2 md:gap-3 lg:gap-4"
              style={{ ...gridStyle, gridAutoRows: 'auto' } as CSSProperties}
            >
              {displayRooms.map((room) => (
                <div
                  key={room.room}
                  data-lights-room-id={room.room}
                  className="col-span-4 scroll-mt-4"
                >
                  <LightsRoomSection
                    room={room}
                    expanded={expandedRooms[room.room] ?? false}
                    onExpandedChange={handleExpandedChange}
                    onPower={handleRoomPower}
                    powerPending={pendingBatch === room.room}
                    actionsDisabled={actionPending}
                    isEditMode={isEditMode}
                    onRemoveEntity={onRemoveEntity}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          icon={Lightbulb}
          title={t('sections.lights.emptyTitle')}
          description={t('sections.lights.emptyDescription')}
          className="w-full"
        />
      )}
    </SummaryBarStack>
  );
});
