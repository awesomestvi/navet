import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard, Button, InteractivePill } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { CardEditActionButton } from '@navet/app/components/shared/card-edit-action-button';
import { BrightnessSlider } from '@navet/app/components/shared/device-editor';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { LightCard } from '@navet/app/features/lighting/components/light-card';
import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import type { QuickActionRoutine } from '@navet/app/features/tasks/types';
import { useI18n, useMediaQuery, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useProviderEntityModels } from '@navet/app/hooks/use-provider-device';
import type { DeviceWithType } from '@navet/app/types/device.types';
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
import {
  type CSSProperties,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  type LightBatchActionResult,
  setLightsBrightness,
  setLightsPower,
} from './light-dashboard-actions';
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

function describeBatchResult(result: LightBatchActionResult, t: ReturnType<typeof useI18n>['t']) {
  if (result.failed > 0 || result.skippedUnavailable > 0) {
    return t('lighting.dashboard.actionPartial', {
      succeeded: result.succeeded,
      failed: result.failed,
      unavailable: result.skippedUnavailable,
    });
  }
  return t('lighting.dashboard.actionComplete', { count: result.succeeded });
}

const keepCompactLightCardSize = () => {};
const LIGHTS_BENTO_ROW_HEIGHT_PX = 4;

function LightsBentoItem({ children }: { children: ReactNode }) {
  const itemRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rowSpan, setRowSpan] = useState(1);

  useLayoutEffect(() => {
    const item = itemRef.current;
    const content = contentRef.current;

    if (!item || !content) return;

    const updateRowSpan = () => {
      const grid = item.parentElement;
      if (!grid) return;

      const gridStyles = window.getComputedStyle(grid);
      const rowHeight = Number.parseFloat(gridStyles.gridAutoRows) || LIGHTS_BENTO_ROW_HEIGHT_PX;
      const cardGap = Number.parseFloat(gridStyles.columnGap) || 0;
      const contentHeight = content.getBoundingClientRect().height;
      const nextRowSpan = Math.max(1, Math.ceil((contentHeight + cardGap) / rowHeight));

      setRowSpan((current) => (current === nextRowSpan ? current : nextRowSpan));
    };

    updateRowSpan();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateRowSpan);
      return () => window.removeEventListener('resize', updateRowSpan);
    }

    const resizeObserver = new ResizeObserver(updateRowSpan);
    resizeObserver.observe(content);
    window.addEventListener('resize', updateRowSpan);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRowSpan);
    };
  }, []);

  return (
    <div
      ref={itemRef}
      className="col-span-4 min-h-0 min-w-0 self-start"
      style={{ gridRowEnd: `span ${rowSpan}` }}
    >
      <div ref={contentRef} className="min-w-0">
        {children}
      </div>
    </div>
  );
}

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
      className={`relative min-h-[52px] min-w-0 border-b last:border-b-0 ${surface.border}`}
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
        <div
          className={`flex min-h-[52px] items-center gap-2.5 px-2 py-1.5 ${
            theme === 'light' ? 'bg-red-50/90' : 'bg-red-500/10'
          }`}
        >
          <EntityCardHeaderIcon
            IconComponent={CircleAlert}
            isActive={false}
            size="tiny"
            tone="red"
            badgeClassName="h-9 w-9"
            glyphClassName="h-[18px] w-[18px]"
          />
          <span
            className={`min-w-0 flex-1 truncate text-sm font-medium ${
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
  narrow,
  manualExpanded,
  onExpandedChange,
  isEditMode,
  onRemoveEntity,
}: {
  room: LightRoomSummary;
  narrow: boolean;
  manualExpanded?: boolean;
  onExpandedChange: (room: string, expanded: boolean) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const expanded = manualExpanded ?? (!narrow || room.activeCount > 0);
  const [brightness, setBrightness] = useState(room.averageBrightness ?? 50);
  const [pendingPower, setPendingPower] = useState(false);
  const [pendingBrightness, setPendingBrightness] = useState(false);
  const displayName =
    room.room === UNKNOWN_ROOM_LABEL ? t('lighting.dashboard.otherLights') : room.room;
  const availableCount = room.totalCount - room.unavailableCount;
  const allUnavailable = availableCount === 0;

  useEffect(() => {
    if (typeof room.averageBrightness === 'number') setBrightness(room.averageBrightness);
  }, [room.averageBrightness]);

  const showResult = (result: LightBatchActionResult) => {
    const message = describeBatchResult(result, t);
    if (result.failed > 0) toast.error(message);
    else if (result.skippedUnavailable > 0) toast.warning(message);
    else toast.success(message);
  };

  const handlePower = async () => {
    setPendingPower(true);
    try {
      showResult(await setLightsPower(room.lights, room.activeCount > 0 ? 'off' : 'on'));
    } finally {
      setPendingPower(false);
    }
  };

  const handleBrightnessCommit = async (value: number) => {
    setPendingBrightness(true);
    try {
      showResult(await setLightsBrightness(room.lights, value));
    } finally {
      setPendingBrightness(false);
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
    <section aria-label={roomSummary} className="min-h-0">
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
            {room.dimmableCount > 0 && !allUnavailable ? (
              <div className="mt-2 w-full">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className={surface.textSecondary}>
                    {t('lighting.dashboard.roomBrightnessScope', {
                      supported: room.dimmableCount,
                      total: room.totalCount,
                    })}
                  </span>
                  <span className={`tabular-nums ${surface.textPrimary}`}>
                    {brightness}%{pendingBrightness ? '…' : ''}
                  </span>
                </div>
                <div className="pt-1.5 pb-2">
                  <BrightnessSlider
                    value={brightness}
                    onChange={setBrightness}
                    onCommit={(value) => void handleBrightnessCommit(value)}
                    isOn={room.activeCount > 0}
                    disabled={isEditMode || pendingBrightness}
                    showLabel={false}
                    size="medium"
                    activeColor={accentColor}
                    inverseSurface={false}
                  />
                </div>
              </div>
            ) : null}

            <div
              className={`mt-4 overflow-hidden rounded-2xl border ${surface.border} ${surface.subtleBg}`}
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
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const lightEntityIds = useMemo(
    () =>
      Array.from(deviceMap.values())
        .filter((device) => device.type === 'lights')
        .map((device) => device.id),
    [deviceMap]
  );
  const entities = useProviderEntityModels(lightEntityIds);
  const narrow = useMediaQuery('(max-width: 767px)');
  const breakpointCols = useBreakpointCols();
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
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
      model.rooms.every((room) => !(expandedRooms[room.room] ?? (!narrow || room.activeCount > 0))),
    [expandedRooms, model.rooms, narrow]
  );
  const toggleAllRooms = useCallback(() => {
    setExpandedRooms(Object.fromEntries(model.rooms.map((room) => [room.room, allRoomsCollapsed])));
  }, [allRoomsCollapsed, model.rooms]);

  const handleWholeHomePower = async () => {
    setAllPowerPending(true);
    try {
      const result = await setLightsPower(allLights, model.activeCount > 0 ? 'off' : 'on');
      const message = describeBatchResult(result, t);
      if (result.failed > 0) toast.error(message);
      else if (result.skippedUnavailable > 0) toast.warning(message);
      else toast.success(message);
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
        ariaLabel={t('lighting.dashboard.summary', {
          active: model.activeCount,
          rooms: model.activeRoomCount,
          total: model.totalCount,
        })}
        leadingContent={
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <Button
              variant={model.activeCount > 0 ? 'primary' : 'secondary'}
              size="compact"
              leading={<Power className="h-4 w-4" aria-hidden="true" />}
              loading={allPowerPending}
              disabled={model.totalCount === model.unavailableCount || isEditMode}
              onClick={() => void handleWholeHomePower()}
              className="h-[34px] shrink-0 md:h-[42px]"
            >
              {model.activeCount > 0
                ? t('lighting.dashboard.turnOffAllLights')
                : t('lighting.dashboard.turnOnAllLights')}
            </Button>
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
              className="h-[34px] shrink-0 md:h-[42px]"
            >
              {allRoomsCollapsed
                ? t('lighting.dashboard.expandAll')
                : t('lighting.dashboard.collapseAll')}
            </Button>
            <span className={`h-6 shrink-0 border-l ${surface.border}`} aria-hidden="true" />
          </div>
        }
        trailingContent={
          scenes.length > 0 ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {scenes.map((scene) => (
                <InteractivePill
                  key={scene.id}
                  intent="action"
                  variant="ghost"
                  size="compact"
                  icon={Sparkles}
                  disabled={runningSceneId !== null}
                  onClick={() => void runScene(scene)}
                >
                  {scene.name}
                  {runningSceneId === scene.id ? '…' : ''}
                </InteractivePill>
              ))}
            </div>
          ) : undefined
        }
      />

      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
            style={{
              ...(gridStyle as CSSProperties),
              gridAutoRows: `${LIGHTS_BENTO_ROW_HEIGHT_PX}px`,
              rowGap: 0,
            }}
          >
            {model.rooms.map((room) => {
              const expanded = expandedRooms[room.room] ?? (!narrow || room.activeCount > 0);

              return (
                <LightsBentoItem key={room.room}>
                  <LightsRoomSection
                    room={room}
                    narrow={narrow}
                    manualExpanded={expanded}
                    onExpandedChange={handleExpandedChange}
                    isEditMode={isEditMode}
                    onRemoveEntity={onRemoveEntity}
                  />
                </LightsBentoItem>
              );
            })}
          </div>
        </div>
      </div>
    </SummaryBarStack>
  );
});
