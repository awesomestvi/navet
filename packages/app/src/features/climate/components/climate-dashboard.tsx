import {
  AttentionBand,
  type AttentionBandItem,
} from '@navet/app/components/patterns/attention-band';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { DeviceGrid } from '@navet/app/features/dashboard/device-grid';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import type { TemperatureUnit } from '@navet/app/utils/temperature';
import { CircleAlert, Thermometer, TriangleAlert } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import type { ClimateDashboardSection } from '../types/climate-dashboard';
import {
  buildClimateDashboardOverview,
  type ClimateDashboardAttentionItem,
} from '../utils/climate-dashboard-overview';
import { ClimateComfortBanner } from './climate-comfort-banner';

interface ClimateDashboardProps {
  deviceMap: Map<string, DeviceWithType>;
  sections: ClimateDashboardSection[];
  temperatureUnit: TemperatureUnit;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity: (entityId: string) => void;
  densePerformanceMode: boolean;
  optimizeOffscreenPaint: boolean;
}

const CONTROL_GROUPS = new Set<ClimateDashboardSection['key']>(['climate', 'fans', 'humidity']);

function getAttentionIcon(kind: ClimateDashboardAttentionItem['kind']) {
  if (kind === 'temperature') return Thermometer;
  if (kind === 'provider') return TriangleAlert;
  return CircleAlert;
}

function focusDashboardTarget(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  const focusTarget =
    (target.matches('[role="button"], button, [tabindex="0"]') ? target : null) ??
    target.querySelector<HTMLElement>('[role="button"], button, [tabindex="0"]') ??
    target;
  focusTarget.focus({ preventScroll: true });
}

export const ClimateDashboard = memo(function ClimateDashboard({
  deviceMap,
  sections,
  temperatureUnit,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
  densePerformanceMode,
  optimizeOffscreenPaint,
}: ClimateDashboardProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const overview = useMemo(
    () => buildClimateDashboardOverview(deviceMap.values(), temperatureUnit, t),
    [deviceMap, t, temperatureUnit]
  );
  const controlRooms = useMemo(() => {
    const roomIds = new Map<string, string[]>();
    for (const section of sections) {
      if (!CONTROL_GROUPS.has(section.key)) continue;
      for (const entityId of section.orderedIds) {
        const device = deviceMap.get(entityId);
        if (!device || (section.key === 'humidity' && device.type === 'sensors')) continue;
        const room = getDeviceRoomLabel(device);
        const ids = roomIds.get(room) ?? [];
        ids.push(entityId);
        roomIds.set(room, ids);
      }
    }
    return [...roomIds.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([room, orderedIds]) => ({ room, orderedIds }));
  }, [deviceMap, sections]);
  const environmentIds = useMemo(() => {
    const attentionIds = new Set(overview.attentionItems.map((item) => item.deviceId));
    return sections
      .flatMap((section) =>
        section.orderedIds.filter((entityId) => {
          const device = deviceMap.get(entityId);
          if (!device) return false;
          return !CONTROL_GROUPS.has(section.key) || device.type === 'sensors';
        })
      )
      .sort((left, right) => Number(attentionIds.has(right)) - Number(attentionIds.has(left)));
  }, [deviceMap, overview.attentionItems, sections]);
  const controlIds = useMemo(
    () => controlRooms.flatMap(({ orderedIds }) => orderedIds),
    [controlRooms]
  );
  const attentionBandItems = useMemo<AttentionBandItem[]>(
    () =>
      overview.attentionItems.map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        priority: item.priority,
        icon: getAttentionIcon(item.kind),
        actionLabel: t('dashboard.roomNav.view'),
      })),
    [overview.attentionItems, t]
  );
  const handleAttentionSelect = useCallback(
    (selectedItem: AttentionBandItem) => {
      const attentionItem = overview.attentionItems.find((item) => item.id === selectedItem.id);
      const device = attentionItem ? deviceMap.get(attentionItem.deviceId) : undefined;
      if (!device) return;

      focusDashboardTarget(`dashboard-entity-${encodeURIComponent(device.id)}`);
    },
    [deviceMap, overview.attentionItems]
  );
  const renderGrid = (orderedIds: string[]) => (
    <DeviceGrid
      orderedCardIds={orderedIds}
      deviceMap={deviceMap}
      isEditMode={isEditMode}
      cardSizes={cardSizes}
      updateCardSize={updateCardSize}
      onRemoveEntity={onRemoveEntity}
      allowEntityRemoval
      usesHideAction
      densePerformanceMode={densePerformanceMode}
      optimizeOffscreenPaint={optimizeOffscreenPaint}
      getDeviceHeaderSubtitle={getDeviceRoomLabel}
    />
  );

  return (
    <div className="space-y-6 md:space-y-8" data-testid="climate-dashboard">
      <SummaryBarStack>
        <AttentionBand
          items={attentionBandItems}
          ariaLabel={t('dashboard.packs.section.needsAttention')}
          onSelect={handleAttentionSelect}
        />
        <SummaryBar
          items={overview.summaryItems}
          ariaLabel={t('homeSummary.climate')}
          className="ios-pwa-scroll-repaint"
        />
        <ClimateComfortBanner overview={overview} />
      </SummaryBarStack>
      {controlRooms.length > 0 ? (
        <section
          id="climate-rooms"
          tabIndex={-1}
          className="scroll-mt-4 space-y-3 outline-none md:space-y-4"
          data-climate-control-rooms
        >
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
              {t('dashboard.roomNav.openRooms')}
            </h2>
            <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
              {controlIds.length} {t('sections.climate.plural')}
            </span>
          </div>
          {renderGrid(controlIds)}
        </section>
      ) : null}

      {environmentIds.length > 0 ? (
        <section
          id="climate-environment"
          tabIndex={-1}
          className="scroll-mt-4 space-y-3 outline-none md:space-y-4"
          data-climate-environment-details
        >
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
              {t('sensors.category.environmental')}
            </h2>
            <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
              {environmentIds.length}{' '}
              {environmentIds.length === 1
                ? t('sections.climate.singular')
                : t('sections.climate.plural')}
            </span>
          </div>
          {renderGrid(environmentIds)}
        </section>
      ) : null}
    </div>
  );
});
