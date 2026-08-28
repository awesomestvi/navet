import { DashboardGroupingNavigation } from '@navet/app/components/patterns';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { DeviceGrid } from '@navet/app/features/dashboard/device-grid';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useI18n } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import type { TemperatureUnit } from '@navet/app/utils/temperature';
import { memo, useMemo, useState } from 'react';
import type { ClimateDashboardSection } from '../types/climate-dashboard';
import { buildClimateDashboardOverview } from '../utils/climate-dashboard-overview';
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

type ClimateGroupingMode = 'type' | 'room';
type ClimateGroupPriority = 'critical' | 'attention' | null;

interface ClimateCardGroup {
  id: string;
  label: string;
  orderedIds: string[];
  priority: ClimateGroupPriority;
}

function getGroupPriority(
  orderedIds: string[],
  attentionByDeviceId: ReadonlyMap<string, Exclude<ClimateGroupPriority, null>>
): ClimateGroupPriority {
  let hasAttention = false;
  for (const id of orderedIds) {
    const priority = attentionByDeviceId.get(id);
    if (priority === 'critical') return 'critical';
    if (priority === 'attention') hasAttention = true;
  }
  return hasAttention ? 'attention' : null;
}

function sortIdsByAttention(
  orderedIds: string[],
  attentionByDeviceId: ReadonlyMap<string, Exclude<ClimateGroupPriority, null>>
) {
  const rank = (id: string) => {
    const priority = attentionByDeviceId.get(id);
    if (priority === 'critical') return 0;
    if (priority === 'attention') return 1;
    return 2;
  };
  return [...orderedIds].sort((left, right) => rank(left) - rank(right));
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
  const overview = useMemo(
    () => buildClimateDashboardOverview(deviceMap.values(), temperatureUnit, t),
    [deviceMap, t, temperatureUnit]
  );
  const [groupingMode, setGroupingMode] = useState<ClimateGroupingMode>('type');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Record<ClimateGroupingMode, string>>({
    type: '',
    room: '',
  });
  const attentionByDeviceId = useMemo(
    () => new Map(overview.attentionItems.map((item) => [item.deviceId, item.priority] as const)),
    [overview.attentionItems]
  );
  const typeGroups = useMemo<ClimateCardGroup[]>(() => {
    const seenIds = new Set<string>();
    return sections.flatMap((section) => {
      const orderedIds = section.orderedIds.filter((entityId) => {
        if (!deviceMap.has(entityId) || seenIds.has(entityId)) return false;
        seenIds.add(entityId);
        return true;
      });
      if (orderedIds.length === 0) return [];
      const sortedIds = sortIdsByAttention(orderedIds, attentionByDeviceId);
      return [
        {
          id: `type-${section.key}`,
          label: t(section.titleKey),
          orderedIds: sortedIds,
          priority: getGroupPriority(sortedIds, attentionByDeviceId),
        },
      ];
    });
  }, [attentionByDeviceId, deviceMap, sections, t]);
  const roomGroups = useMemo<ClimateCardGroup[]>(() => {
    const idsByRoom = new Map<string, string[]>();
    const seenIds = new Set<string>();
    for (const section of sections) {
      for (const entityId of section.orderedIds) {
        const device = deviceMap.get(entityId);
        if (!device || seenIds.has(entityId)) continue;
        seenIds.add(entityId);
        const room = getDeviceRoomLabel(device);
        const ids = idsByRoom.get(room) ?? [];
        ids.push(entityId);
        idsByRoom.set(room, ids);
      }
    }
    return [...idsByRoom.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([room, orderedIds]) => {
        const sortedIds = sortIdsByAttention(orderedIds, attentionByDeviceId);
        return {
          id: `room-${encodeURIComponent(room)}`,
          label: room,
          orderedIds: sortedIds,
          priority: getGroupPriority(sortedIds, attentionByDeviceId),
        };
      });
  }, [attentionByDeviceId, deviceMap, sections]);
  const groups = groupingMode === 'type' ? typeGroups : roomGroups;
  const requestedGroupId = selectedGroupIds[groupingMode];
  const selectedGroup = groups.find((group) => group.id === requestedGroupId) ?? groups[0] ?? null;
  const handleGroupingModeChange = (mode: ClimateGroupingMode) => {
    setGroupingMode(mode);
  };
  const handleGroupChange = (groupId: string) => {
    setSelectedGroupIds((current) => ({ ...current, [groupingMode]: groupId }));
  };
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
    <div className="space-y-6 md:space-y-7" data-testid="climate-dashboard">
      <SummaryBarStack>
        <SummaryBar
          items={overview.summaryItems}
          ariaLabel={t('homeSummary.climate')}
          className="ios-pwa-scroll-repaint"
        />
        <ClimateComfortBanner overview={overview} />
      </SummaryBarStack>
      {selectedGroup ? (
        <div className="space-y-4">
          <DashboardGroupingNavigation
            ariaLabel={t('homeSummary.climate')}
            groupingLabel={t('dashboard.roomNav.grouping.label')}
            idPrefix="climate-group"
            items={groups.map((group) => ({
              id: group.id,
              label: group.label,
              indicatorTone: group.priority ?? undefined,
            }))}
            modes={[
              { id: 'type', label: t('dashboard.roomNav.grouping.type') },
              { id: 'room', label: t('dashboard.roomNav.grouping.room') },
            ]}
            selectedItemId={selectedGroup.id}
            selectedModeId={groupingMode}
            onModeChange={(modeId) => {
              if (modeId === 'type' || modeId === 'room') handleGroupingModeChange(modeId);
            }}
            onItemChange={handleGroupChange}
          />
          <section
            role="tabpanel"
            id={`climate-group-panel-${selectedGroup.id}`}
            aria-labelledby={`climate-group-tab-${selectedGroup.id}`}
            data-climate-group-panel={selectedGroup.id}
          >
            {renderGrid(selectedGroup.orderedIds)}
          </section>
        </div>
      ) : null}
    </div>
  );
});
