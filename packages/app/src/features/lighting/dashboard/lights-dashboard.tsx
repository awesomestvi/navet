import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard, Button } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { CardEditActionButton } from '@navet/app/components/shared/card-edit-action-button';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { LightCard } from '@navet/app/features/lighting/components/light-card';
import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import type { QuickActionRoutine } from '@navet/app/features/tasks/types';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useProviderEntityModels } from '@navet/app/hooks/use-provider-device';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { darkenColor } from '@navet/app/utils/color-utils';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  CircleAlert,
  Lightbulb,
  Power,
  Sparkles,
  SunMedium,
  X,
} from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
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

const LIGHT_ROOM_DEFAULT_EXPANDED = true;

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
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={`relative min-w-0 border-b last:border-b-0 ${surface.border} ${
        isEditMode ? 'pr-10' : ''
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
  manualExpanded,
  onExpandedChange,
  isEditMode,
  onRemoveEntity,
}: {
  room: LightRoomSummary;
  manualExpanded?: boolean;
  onExpandedChange: (room: string, expanded: boolean) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const expanded = manualExpanded ?? LIGHT_ROOM_DEFAULT_EXPANDED;
  const [pendingPower, setPendingPower] = useState(false);
  const displayName =
    room.room === UNKNOWN_ROOM_LABEL ? t('lighting.dashboard.otherLights') : room.room;
  const availableCount = room.totalCount - room.unavailableCount;
  const allUnavailable = availableCount === 0;

  const handlePower = async () => {
    setPendingPower(true);
    try {
      showBatchIssue(await setLightsPower(room.lights, room.activeCount > 0 ? 'off' : 'on'), t);
    } finally {
      setPendingPower(false);
    }
  };

  const roomSummary = t('lighting.dashboard.roomAria', {
    room: displayName,
    active: room.activeCount,
    total: room.totalCount,
    brightness: room.averageBrightness ?? 0,
  });
  const roomStateSummary = `${
    allUnavailable
      ? t('lighting.dashboard.roomUnavailable')
      : t('lighting.dashboard.roomState', {
          active: room.activeCount,
          total: room.totalCount,
        })
  }${
    room.unavailableCount > 0
      ? ` · ${t('lighting.dashboard.unavailableCount', { count: room.unavailableCount })}`
      : ''
  }`;

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
        headerMarginBottomClassName={expanded ? undefined : 'mb-0'}
        headerLeading={
          <EntityCardHeaderIcon
            IconComponent={Lightbulb}
            isActive={room.activeCount > 0}
            size="large"
            tone={room.activeCount > 0 ? 'primary' : 'neutral'}
            baseColor={accentColor}
            variant="large"
            ariaLabel={
              room.activeCount > 0
                ? t('lighting.dashboard.turnAllOff')
                : t('lighting.dashboard.turnAllOn')
            }
            onClick={
              allUnavailable || isEditMode || pendingPower
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    void handlePower();
                  }
            }
            onPointerDown={(event) => event.stopPropagation()}
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
            aria-label={roomSummary}
            title={roomSummary}
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
              className={`mt-3 border-t ${surface.border}`}
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
  const surface = getThemeSurfaceTokens(theme);
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
  const [allPowerPending, setAllPowerPending] = useState(false);
  const [runningSceneId, setRunningSceneId] = useState<string | null>(null);
  const allLights = useMemo(() => model.rooms.flatMap((room) => room.lights), [model.rooms]);
  const averageBrightness = useMemo(() => {
    const activeBrightnessValues = allLights.flatMap((light) =>
      light.available &&
      light.isOn &&
      light.supportsBrightness &&
      typeof light.brightness === 'number'
        ? [light.brightness]
        : []
    );

    if (activeBrightnessValues.length === 0) return undefined;

    return Math.round(
      activeBrightnessValues.reduce((total, brightness) => total + brightness, 0) /
        activeBrightnessValues.length
    );
  }, [allLights]);
  const summaryItems = useMemo<HomeStatusSummaryItem[]>(() => {
    const items: HomeStatusSummaryItem[] = [
      {
        id: 'lights-on',
        title: t('lighting.dashboard.title'),
        value: t('lighting.dashboard.roomState', {
          active: model.activeCount,
          total: model.totalCount,
        }),
        icon: Lightbulb,
        iconColor: '#facc15',
      },
    ];

    if (typeof averageBrightness === 'number') {
      items.push({
        id: 'average-brightness',
        title: t('interactionPreview.preview.brightness'),
        value: `${averageBrightness}%`,
        icon: SunMedium,
        iconColor: '#fbbf24',
      });
    }

    if (model.unavailableCount > 0) {
      items.push({
        id: 'unavailable-lights',
        title: t('lighting.dashboard.unavailable'),
        value: t('lighting.dashboard.unavailableCount', { count: model.unavailableCount }),
        icon: CircleAlert,
        iconColor: '#f87171',
      });
    }

    return items;
  }, [averageBrightness, model.activeCount, model.totalCount, model.unavailableCount, t]);
  const handleExpandedChange = useCallback((roomName: string, expanded: boolean) => {
    setExpandedRooms((current) => ({ ...current, [roomName]: expanded }));
  }, []);
  const allRoomsCollapsed = useMemo(
    () =>
      model.rooms.length > 0 &&
      model.rooms.every((room) => !(expandedRooms[room.room] ?? LIGHT_ROOM_DEFAULT_EXPANDED)),
    [expandedRooms, model.rooms]
  );
  const toggleAllRooms = useCallback(() => {
    setExpandedRooms(Object.fromEntries(model.rooms.map((room) => [room.room, allRoomsCollapsed])));
  }, [allRoomsCollapsed, model.rooms]);

  const handleWholeHomePower = async () => {
    setAllPowerPending(true);
    try {
      const result = await setLightsPower(allLights, model.activeCount > 0 ? 'off' : 'on');
      showBatchIssue(result, t);
    } finally {
      setAllPowerPending(false);
    }
  };

  const runScene = async (scene: QuickActionRoutine) => {
    setRunningSceneId(scene.id);
    try {
      const result = await dispatchEntityCommand({ type: 'turn_on', entityId: scene.id });
      if (!result.accepted) throw new Error(result.error);
    } catch {
      toast.error(t('scene.activateFailed'));
    } finally {
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
                    disabled={runningSceneId !== null}
                    onClick={() => void runScene(scene)}
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
            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
              {summaryItems.length > 2 ? (
                <span
                  className={`mr-0.5 h-6 shrink-0 border-l ${surface.border}`}
                  aria-hidden="true"
                />
              ) : null}
              <Button
                variant="secondary"
                size="compact"
                leading={
                  allRoomsCollapsed ? (
                    <ChevronsDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronsUp className="h-4 w-4" aria-hidden="true" />
                  )
                }
                disabled={model.rooms.length === 0}
                onClick={toggleAllRooms}
                className="h-9 shrink-0"
              >
                {allRoomsCollapsed
                  ? t('lighting.dashboard.expandAll')
                  : t('lighting.dashboard.collapseAll')}
              </Button>
              <Button
                variant="secondary"
                size="compact"
                leading={<Power className="h-4 w-4" aria-hidden="true" />}
                loading={allPowerPending}
                disabled={model.totalCount === model.unavailableCount || isEditMode}
                onClick={() => void handleWholeHomePower()}
                className="h-9 shrink-0"
              >
                {model.activeCount > 0
                  ? t('lighting.dashboard.turnOffAllLights')
                  : t('lighting.dashboard.turnOnAllLights')}
              </Button>
            </div>
          </>
        }
      />

      <div className="grid w-full grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-4">
        {model.rooms.map((room) => (
          <LightsRoomSection
            key={room.room}
            room={room}
            manualExpanded={expandedRooms[room.room]}
            onExpandedChange={handleExpandedChange}
            isEditMode={isEditMode}
            onRemoveEntity={onRemoveEntity}
          />
        ))}
      </div>
    </SummaryBarStack>
  );
});
