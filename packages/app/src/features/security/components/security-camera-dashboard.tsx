import { InteractivePill } from '@navet/app/components/primitives';
import {
  type CardSize,
  getCardGridAutoRowsStyle,
  getCardSpanClass,
  getResponsiveCardSize,
} from '@navet/app/components/shared/card-size-selector';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { readNavetCameraState } from '@navet/app/core/navet-device-state';
import { DashboardCardItem, DashboardEditActions } from '@navet/app/features/dashboard';
import { packDashboardGridItems } from '@navet/app/features/dashboard/device-grid/device-grid-layout';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { useProgressiveBatching } from '@navet/app/features/dashboard/hooks/use-progressive-batching';
import { normalizeCameraDirectStreamUrl } from '@navet/app/features/security/hooks/use-camera-playback-plan';
import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useProviderCameraTopology } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { usePersistedState } from '@navet/app/hooks/use-persisted-state';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import { type ThemeType, useTheme } from '@navet/app/hooks/use-theme';
import { useI18n } from '@navet/app/i18n';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { normalizeResourceUrl } from '@navet/app/services/integration-resource.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import {
  type CameraFitMode,
  type CameraStreamPreference,
  type CameraViewMode,
  isDirectCameraStreamSource,
  useSettingsStore,
} from '@navet/app/stores/settings-store';
import type { CameraDevice, DeviceWithType } from '@navet/app/types/device.types';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import { CircleAlert, CircleOff, Radio, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  type CSSProperties,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { resolveDashboardPerformanceProfile } from '../../dashboard/hooks/use-dashboard-performance-mode';
import type {
  CameraDashboardModel,
  SecurityGroupSummary,
} from '../utils/security-camera-dashboard-model';
import {
  DEFAULT_SECURITY_OVERVIEW_PREFERENCE,
  getAutomaticSecurityOverviewEntityIds,
  normalizeSecurityOverviewPreference,
  resolveSecurityOverviewEntities,
} from '../utils/security-overview-preferences';
import { CameraLiveViewer } from './camera-card/camera-live-viewer';
import {
  appendCameraCacheBuster,
  normalizeCameraSnapshotUrl,
  resolveViewerInitialCameraViewMode,
} from './camera-card/camera-view-mode';
import { useProviderCameraLiveData } from './camera-card/use-provider-camera-live-data';
import { SecurityCommandCenter } from './security-command-center';

const SecurityOverviewCustomizationDialog = lazy(async () => {
  const module = await import('./security-overview-customization-dialog');
  return { default: module.SecurityOverviewCustomizationDialog };
});

interface SecurityCameraDashboardProps {
  model: CameraDashboardModel;
  isEditMode: boolean;
  onToggleEditMode?: () => void;
  onAddEntity?: () => void;
  alarms?: NavetAlarmEntity[];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onRemoveEntity?: (entityId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  isOverviewCustomizationOpen?: boolean;
  onOverviewCustomizationOpenChange?: (open: boolean) => void;
}

const SECURITY_DASHBOARD_SELECTED_GROUP_KEY = 'navet-security-dashboard-selected-group';

function getIndicatorDotClassName(group: SecurityGroupSummary, theme: ThemeType) {
  const isLightTheme = theme === 'light';
  const usesLockAlertColor = group.id === 'locks' && group.warning > 0;
  const usesSirenCriticalColor = group.id === 'sirens' && group.critical > 0;

  if (usesSirenCriticalColor) {
    return isLightTheme ? 'bg-red-600' : 'bg-red-500';
  }

  if (usesLockAlertColor) {
    return isLightTheme ? 'bg-amber-500' : 'bg-amber-400';
  }

  if (group.critical > 0) {
    return isLightTheme ? 'bg-rose-600' : 'bg-rose-500';
  }

  if (group.warning > 0) {
    return isLightTheme ? 'bg-amber-500' : 'bg-amber-400';
  }

  if (group.unknown > 0) {
    return isLightTheme ? 'bg-slate-400' : 'bg-zinc-400';
  }

  if (group.active > 0) {
    if (group.id === 'cameras') {
      return isLightTheme ? 'bg-sky-500' : 'bg-sky-400';
    }

    if (group.id === 'motion-occupancy') {
      return isLightTheme ? 'bg-amber-500' : 'bg-amber-300';
    }

    return isLightTheme ? 'bg-sky-500' : 'bg-sky-400';
  }

  return isLightTheme ? 'bg-slate-400' : 'bg-zinc-400';
}

function getDetailsPillClassName(
  isActive: boolean,
  theme: ThemeType,
  surface: ReturnType<typeof getThemeSurfaceTokens>
) {
  if (isActive) {
    if (theme === 'light') {
      return `border ${surface.borderStrong} bg-white text-slate-950 shadow-sm`;
    }

    if (theme === 'glass') {
      return 'border-white/14 bg-slate-950/88 text-white shadow-none';
    }

    if (theme === 'black') {
      return 'border-white/10 bg-zinc-950 text-white shadow-none';
    }

    return 'border-[rgba(161,161,170,0.22)] bg-[rgba(18,18,21,0.98)] text-white shadow-none';
  }

  if (theme === 'light') {
    return `border border-transparent bg-transparent ${surface.hoverBg} text-slate-700`;
  }

  if (theme === 'glass') {
    return 'border-transparent bg-transparent hover:bg-white/8 text-white/80';
  }

  if (theme === 'black') {
    return 'border-transparent bg-transparent hover:bg-zinc-950 text-zinc-300';
  }

  return 'border-transparent bg-transparent hover:bg-zinc-800/82 text-zinc-300';
}

function readImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveHomeAssistantImageUrl(imageUrl: string | undefined) {
  if (!imageUrl) {
    return undefined;
  }

  return normalizeResourceUrl(imageUrl, 'home_assistant') ?? imageUrl;
}

function SummaryCameraViewer({
  camera,
  isOpen,
  onOpenChange,
}: {
  camera: CameraDevice;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const providerEntity = useProviderEntityModel(camera.id);
  const { siblingIds: deviceEntityIds } = useProviderCameraTopology(camera.id);
  const { cameraState, liveEntity, liveState } = useProviderCameraLiveData(
    camera.id,
    deviceEntityIds
  );
  const preferredTransport = useSettingsStore(
    settingsSelectors.cameraStreamPreferenceForEntity(camera.id)
  );
  const updateCameraStreamPreference = useSettingsStore(
    settingsSelectors.updateCameraStreamPreference
  );
  const webRtcStreamSource = useSettingsStore(
    settingsSelectors.cameraWebRtcStreamSourceForEntity(camera.id)
  );
  const directStreamUrl = useSettingsStore(
    settingsSelectors.cameraDirectStreamUrlForEntity(camera.id)
  );
  const cameraFitMode = useSettingsStore(settingsSelectors.cameraFitModeForEntity(camera.id));
  const updateCameraFitMode = useSettingsStore(settingsSelectors.updateCameraFitMode);
  const hasConfiguredDirectStream =
    isDirectCameraStreamSource(webRtcStreamSource) &&
    normalizeCameraDirectStreamUrl(directStreamUrl) !== null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('live');

  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const providerState = readNavetCameraState(providerEntity);
  const liveEntityPicture =
    readImageUrl(liveAttrs?.entity_picture_local) ?? readImageUrl(liveAttrs?.entity_picture);
  const initialSnapshotUrl =
    readImageUrl(camera.entityPicture) ??
    readImageUrl(
      typeof providerState?.entityPicture === 'string' ? providerState.entityPicture : undefined
    );
  const baseSnapshotUrl = normalizeCameraSnapshotUrl(
    liveEntityPicture ? resolveHomeAssistantImageUrl(liveEntityPicture) : initialSnapshotUrl
  );
  const snapshotUrl = appendCameraCacheBuster(baseSnapshotUrl, refreshKey);
  const hasSnapshot = Boolean(snapshotUrl);
  const isStreamCapable =
    liveState.isStreamCapable ||
    providerState?.isStreamCapable === true ||
    (camera.isStreamCapable ?? false);
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCameraViewMode(
      resolveViewerInitialCameraViewMode({
        isStreamCapable: isStreamCapable || hasConfiguredDirectStream,
        hasSnapshot,
      })
    );
  }, [hasConfiguredDirectStream, hasSnapshot, isOpen, isStreamCapable]);

  const handleRefresh = () => {
    setRefreshKey((key) => key + 1);
    void integrationCameraFeatureService.refreshCameraSnapshot?.(camera.id).catch(() => undefined);
  };
  const handlePreferredTransportChange = useCallback(
    (transport: CameraStreamPreference) => {
      updateCameraStreamPreference(camera.id, transport);
      setRefreshKey((key) => key + 1);
    },
    [camera.id, updateCameraStreamPreference]
  );
  const handleCameraFitModeChange = useCallback(
    (mode: CameraFitMode) => {
      updateCameraFitMode(camera.id, mode);
    },
    [camera.id, updateCameraFitMode]
  );

  return (
    <CameraLiveViewer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      entityId={camera.id}
      name={camera.name}
      room={camera.room}
      cameraState={cameraState}
      snapshotUrl={snapshotUrl}
      cameraViewMode={cameraViewMode}
      preferredTransport={preferredTransport}
      webRtcStreamSource={webRtcStreamSource}
      directStreamUrl={directStreamUrl}
      cameraFitMode={cameraFitMode}
      isStreamCapable={isStreamCapable}
      motionDetectionEnabled={liveState.motionDetectionEnabled}
      initialStreamResource={null}
      onRefresh={handleRefresh}
      onCameraViewModeChange={setCameraViewMode}
      onPreferredTransportChange={handlePreferredTransportChange}
      onCameraFitModeChange={handleCameraFitModeChange}
    />
  );
}

function readSecureSummaryGroupId(device: DeviceWithType): string | null {
  switch (device.id) {
    case 'security.aggregate.attention.alarms':
      return 'alarms';
    case 'security.aggregate.attention.doors-windows':
      return 'doors-windows';
    case 'security.aggregate.attention.locks':
      return 'locks';
    case 'security.aggregate.attention.motion-occupancy':
      return 'motion-occupancy';
    case 'security.aggregate.attention.hazards':
      return 'hazards';
    case 'security.aggregate.attention.cameras':
      return 'cameras';
    case 'security.aggregate.attention.sirens':
      return 'sirens';
    case 'security.aggregate.attention.system':
      return 'system';
    case 'security.aggregate.openings.secure':
      return 'doors-windows';
    case 'security.aggregate.locks.secure':
      return 'locks';
    case 'security.aggregate.motion.secure':
      return 'motion-occupancy';
    case 'security.aggregate.hazards.secure':
      return 'hazards';
    default:
      return null;
  }
}

function DetailsGrid({
  devices,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
  allowEntityRemoval = true,
  embeddedColumnCount,
}: {
  devices: DeviceWithType[];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  embeddedColumnCount?: number;
}) {
  const breakpointCols = useBreakpointCols();
  const { disableAnimations, effectsQuality, lowPowerMode } = useSettingsStore(
    useShallow((state) => ({
      disableAnimations: settingsSelectors.disableAnimations(state),
      effectsQuality: settingsSelectors.effectsQuality(state),
      lowPowerMode: settingsSelectors.lowPowerMode(state),
    }))
  );
  const {
    outerRef,
    innerRef,
    outerContainerStyle,
    innerContainerStyle,
    isAutoScaled,
    gridStyle,
    renderedGridCols,
  } = useFitDashboardGrid(breakpointCols, embeddedColumnCount === undefined);
  const performanceProfile = useMemo(
    () =>
      resolveDashboardPerformanceProfile({
        activeSection: 'security',
        deviceTier: detectDeviceTier(),
        effectsQuality,
        isEditMode,
        lowPowerMode,
        reducedEffectsEnabled: disableAnimations || lowPowerMode,
        visibleCardCount: devices.length,
        visibleDevices: devices,
      }),
    [devices, disableAnimations, effectsQuality, isEditMode, lowPowerMode]
  );
  const shouldBatch = performanceProfile.batchHeavyCards;
  const batchedVisibleCount = useProgressiveBatching(devices.length, isEditMode, {
    enabled: shouldBatch,
    initialBatch: performanceProfile.progressiveBatchInitialCount,
    batchSize: performanceProfile.progressiveBatchSize,
  });
  const visibleDevices = shouldBatch ? devices.slice(0, batchedVisibleCount) : devices;
  const optimizeOffscreenPaint = performanceProfile.optimizeOffscreenPaint;
  const columnCount = embeddedColumnCount ?? renderedGridCols;
  const resolvedCards = useMemo(
    () =>
      visibleDevices.map((device) => {
        const defaultSize = device.type === 'cameras' ? 'large' : device.size;
        const size = cardSizes[device.id] ?? defaultSize;

        return {
          device,
          size,
          gridSize: getResponsiveCardSize(size, breakpointCols),
        };
      }),
    [breakpointCols, cardSizes, visibleDevices]
  );
  const gridPlacements = useMemo(
    () =>
      packDashboardGridItems(
        resolvedCards.map(({ device, gridSize: size }) => ({ id: device.id, size })),
        columnCount
      ),
    [columnCount, resolvedCards]
  );
  const resolvedGridStyle =
    embeddedColumnCount === undefined
      ? gridStyle
      : {
          ...getCardGridAutoRowsStyle(breakpointCols),
          gridTemplateColumns: `repeat(${embeddedColumnCount}, minmax(0, 1fr))`,
        };

  return (
    <DashboardEditActions isEditMode={isEditMode} onRemoveEntity={onRemoveEntity}>
      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            data-testid="security-card-grid"
            className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
            style={resolvedGridStyle as CSSProperties}
          >
            {resolvedCards.map(({ device, size, gridSize }) => {
              const placement = gridPlacements.get(device.id);

              return (
                <div
                  key={device.id}
                  data-security-entity-id={device.id}
                  tabIndex={-1}
                  className={`${getCardSpanClass(gridSize)} [&>*]:h-full${
                    optimizeOffscreenPaint
                      ? ' [content-visibility:auto] [contain-intrinsic-block-size:22rem]'
                      : ''
                  } rounded-[22px] focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:ring-offset-2 focus:ring-offset-transparent`}
                  style={{
                    gridColumnStart: placement?.column,
                    gridRowStart: placement?.row,
                  }}
                >
                  <DashboardCardItem
                    id={device.id}
                    device={device}
                    size={size}
                    isEditMode={isEditMode}
                    handleSizeChange={updateCardSize}
                    onRemoveEntity={onRemoveEntity}
                    allowEntityRemoval={allowEntityRemoval}
                    usesHideAction
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardEditActions>
  );
}

function MobileOverviewCarousel({
  devices,
  cardSizes,
  updateCardSize,
  isEditMode,
}: {
  devices: DeviceWithType[];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}) {
  const { t } = useI18n();
  const hasMultipleCards = devices.length > 1;

  return (
    <section
      aria-label={t('security.overview.customize.previewLabel')}
      className="-mx-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="security-overview-carousel"
    >
      <div className="flex gap-3">
        {devices.map((device) => {
          const defaultSize = device.type === 'cameras' ? 'large' : device.size;
          const size = cardSizes[device.id] ?? defaultSize;

          return (
            <div
              key={device.id}
              className={`h-44 min-w-0 flex-none snap-start scroll-ml-1 [contain-intrinsic-size:auto_11rem] [content-visibility:auto] [&>*]:h-full ${
                hasMultipleCards ? 'w-[84%] max-w-96' : 'w-full'
              }`}
              data-security-entity-id={device.id}
              data-testid="security-overview-carousel-item"
            >
              <DashboardCardItem
                id={device.id}
                device={device}
                size={size}
                isEditMode={isEditMode}
                handleSizeChange={updateCardSize}
                allowEntityRemoval={false}
                usesHideAction
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DetailsSection({
  groupSummaries,
  selectedGroupId,
  onSelectGroup,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
  surface,
  embeddedColumnCount,
}: {
  groupSummaries: SecurityGroupSummary[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  embeddedColumnCount?: number;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const selectedGroup =
    groupSummaries.find((group) => group.id === selectedGroupId) ?? groupSummaries[0] ?? null;

  if (!selectedGroup) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={t('security.overview.detailGroups')}
        className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max min-w-full flex-nowrap gap-2">
          {groupSummaries.map((group) => {
            const isActive = group.id === selectedGroup.id;
            const attentionCount = group.critical + group.warning + group.unknown;
            const indicatorCount = group.id === 'presence' ? 0 : attentionCount + group.active;

            return (
              <InteractivePill
                key={group.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`security-details-panel-${group.id}`}
                id={`security-details-tab-${group.id}`}
                active={isActive}
                size="small"
                intent="navigation"
                variant="ghost"
                onClick={() => onSelectGroup(group.id)}
                className={`shrink-0 rounded-[22px] gap-2 whitespace-nowrap border transition-colors ${getDetailsPillClassName(
                  isActive,
                  theme,
                  surface
                )}`}
              >
                {indicatorCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${getIndicatorDotClassName(group, theme)}`}
                  />
                ) : null}
                <span>{group.label}</span>
              </InteractivePill>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`security-details-panel-${selectedGroup.id}`}
        aria-labelledby={`security-details-tab-${selectedGroup.id}`}
        className=""
      >
        <DetailsGrid
          devices={selectedGroup.entities}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          isEditMode={isEditMode}
          onRemoveEntity={onRemoveEntity}
          embeddedColumnCount={embeddedColumnCount}
        />
      </div>
    </div>
  );
}

export function SecurityCameraDashboard({
  model,
  isEditMode,
  alarms = [],
  cardSizes,
  updateCardSize,
  onRemoveEntity,
  surface,
  isOverviewCustomizationOpen = false,
  onOverviewCustomizationOpenChange,
}: SecurityCameraDashboardProps) {
  const { t } = useI18n();
  const [viewerCamera, setViewerCamera] = useState<CameraDevice | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [pendingNavigationEntityId, setPendingNavigationEntityId] = useState<string | null>(null);
  const [storedOverviewPreference, setStoredOverviewPreference] = usePersistedState(
    STORAGE_KEYS.securityOverviewPreferences,
    DEFAULT_SECURITY_OVERVIEW_PREFERENCE
  );
  const overviewPreference = useMemo(
    () => normalizeSecurityOverviewPreference(storedOverviewPreference),
    [storedOverviewPreference]
  );
  const automaticOverviewEntityIds = useMemo(
    () => getAutomaticSecurityOverviewEntityIds(model.allEntities),
    [model.allEntities]
  );
  const overviewEntities = useMemo(
    () => resolveSecurityOverviewEntities(overviewPreference, model.allEntities),
    [model.allEntities, overviewPreference]
  );
  const summaryItems = useMemo<HomeStatusSummaryItem[]>(() => {
    const items: HomeStatusSummaryItem[] = [];
    if (model.summary.liveItems.length > 0) {
      items.push({
        id: 'security-live',
        title: t('security.dashboard.live'),
        value: t('security.summary.live', { count: model.summary.liveItems.length }),
        icon: Radio,
        iconColor: '#94a3b8',
      });
    }
    if (model.summary.criticalCount > 0) {
      items.push({
        id: 'security-critical',
        title: t('security.severity.critical'),
        value: String(model.summary.criticalCount),
        icon: TriangleAlert,
        iconColor: '#ef4444',
        priority: 'critical',
        tone: 'danger',
      });
    }
    if (model.summary.warningCount > 0) {
      items.push({
        id: 'security-attention',
        title: t('security.severity.attention'),
        value: t('security.summary.alerts', { count: model.summary.warningCount }),
        icon: CircleAlert,
        iconColor: '#f59e0b',
        priority: 'attention',
        tone: 'warning',
      });
    }
    if (model.summary.unknownCount > 0) {
      items.push({
        id: 'security-unavailable',
        title: t('security.dashboard.unavailable'),
        value: t('security.summary.unavailable', { count: model.summary.unknownCount }),
        icon: CircleOff,
        iconColor: '#94a3b8',
        priority: 'attention',
        tone: 'neutral',
      });
    }
    if (model.summary.normalCount > 0) {
      items.push({
        id: 'security-secure',
        title: t('security.severity.normal'),
        value: String(model.summary.normalCount),
        icon: ShieldCheck,
        iconColor: '#94a3b8',
      });
    }
    return items;
  }, [model.summary, t]);
  const defaultGroupId = useMemo(
    () =>
      model.summary.groupSummaries.find((group) => group.defaultExpanded)?.id ??
      model.summary.groupSummaries[0]?.id ??
      '',
    [model.summary.groupSummaries]
  );
  const [selectedGroupId, setSelectedGroupId] = usePersistedState(
    SECURITY_DASHBOARD_SELECTED_GROUP_KEY,
    defaultGroupId
  );

  useEffect(() => {
    setSelectedGroupId((current) => {
      if (current && model.summary.groupSummaries.some((group) => group.id === current)) {
        return current;
      }

      return defaultGroupId;
    });
  }, [defaultGroupId, model.summary.groupSummaries]);

  useEffect(() => {
    if (!pendingNavigationEntityId) return;

    const frame = requestAnimationFrame(() => {
      const detailCards = detailsRef.current?.querySelectorAll<HTMLElement>(
        '[data-security-entity-id]'
      );
      const target = Array.from(detailCards ?? []).find(
        (card) => card.dataset.securityEntityId === pendingNavigationEntityId
      );

      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setPendingNavigationEntityId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [pendingNavigationEntityId, selectedGroupId]);

  const navigateToEntity = (device: DeviceWithType) => {
    const secureSummaryGroupId = readSecureSummaryGroupId(device);
    if (secureSummaryGroupId) {
      setSelectedGroupId(secureSummaryGroupId);
      setPendingNavigationEntityId(device.id);
      return;
    }

    const targetGroup = model.summary.groupSummaries.find((group) =>
      group.entities.some((entity) => entity.id === device.id)
    );
    if (!targetGroup) {
      return;
    }

    setSelectedGroupId(targetGroup.id);
    setPendingNavigationEntityId(device.id);
  };

  const handleAttentionItemClick = (device: DeviceWithType) => {
    navigateToEntity(device);
  };

  return (
    <div className="space-y-7">
      <SummaryBarStack>
        <SummaryBar items={summaryItems} ariaLabel={t('homeSummary.security')} />
        <SecurityCommandCenter
          model={model}
          alarms={alarms}
          surface={surface}
          renderOverviewContent={(columnCount, isMobile) =>
            isMobile ? (
              <MobileOverviewCarousel
                devices={overviewEntities}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                isEditMode={isEditMode}
              />
            ) : (
              <DetailsGrid
                devices={overviewEntities}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                isEditMode={isEditMode}
                allowEntityRemoval={false}
                embeddedColumnCount={columnCount}
              />
            )
          }
          renderDetailsContent={
            model.summary.totalEntities > 0
              ? (columnCount) => (
                  <div ref={detailsRef}>
                    <DetailsSection
                      groupSummaries={model.summary.groupSummaries}
                      selectedGroupId={selectedGroupId}
                      onSelectGroup={setSelectedGroupId}
                      cardSizes={cardSizes}
                      updateCardSize={updateCardSize}
                      isEditMode={isEditMode}
                      onRemoveEntity={onRemoveEntity}
                      surface={surface}
                      embeddedColumnCount={columnCount}
                    />
                  </div>
                )
              : undefined
          }
          onSelectEntity={handleAttentionItemClick}
          onSelectCamera={setViewerCamera}
        />
      </SummaryBarStack>

      {viewerCamera ? (
        <SummaryCameraViewer
          camera={viewerCamera}
          isOpen={viewerCamera !== null}
          onOpenChange={(open) => {
            if (!open) {
              setViewerCamera(null);
            }
          }}
        />
      ) : null}

      {isOverviewCustomizationOpen ? (
        <Suspense fallback={null}>
          <SecurityOverviewCustomizationDialog
            automaticEntityIds={automaticOverviewEntityIds}
            entities={model.allEntities}
            isOpen={isOverviewCustomizationOpen}
            onOpenChange={(open) => onOverviewCustomizationOpenChange?.(open)}
            onSave={setStoredOverviewPreference}
            preference={overviewPreference}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
