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
import { memo, useMemo } from 'react';
import type { ClimateDashboardSection } from '../types/climate-dashboard';
import { buildClimateDashboardOverview } from '../utils/climate-dashboard-overview';

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
    return [...roomIds.entries()].map(([room, orderedIds]) => ({ room, orderedIds }));
  }, [deviceMap, sections]);
  const detailSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          orderedIds: section.orderedIds.filter((entityId) => {
            const device = deviceMap.get(entityId);
            return !CONTROL_GROUPS.has(section.key) || device?.type === 'sensors';
          }),
        }))
        .filter((section) => section.orderedIds.length > 0),
    [deviceMap, sections]
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
    <SummaryBarStack data-testid="climate-dashboard">
      <SummaryBar
        items={overview.summaryItems}
        ariaLabel={t('homeSummary.climate')}
        className="ios-pwa-scroll-repaint"
      />
      {controlRooms.length > 0 ? (
        <div className="space-y-6 md:space-y-8" data-climate-control-rooms>
          {controlRooms.map(({ room, orderedIds }) => (
            <section
              key={room}
              id={`climate-room-${encodeURIComponent(room)}`}
              className="scroll-mt-4 space-y-3 md:space-y-4"
            >
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
                  {room}
                </h2>
                <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
                  {orderedIds.length}{' '}
                  {orderedIds.length === 1
                    ? t('sections.climate.singular')
                    : t('sections.climate.plural')}
                </span>
              </div>
              {renderGrid(orderedIds)}
            </section>
          ))}
        </div>
      ) : null}

      {detailSections.length > 0 ? (
        <div className="space-y-6 md:space-y-8" data-climate-environment-details>
          {detailSections.map((section) => (
            <section
              key={section.key}
              id={`climate-section-${section.key}`}
              className="scroll-mt-4 space-y-3 md:space-y-4"
            >
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
                  {t(section.titleKey)}
                </h2>
                <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
                  {section.orderedIds.length}{' '}
                  {section.orderedIds.length === 1
                    ? t('sections.climate.singular')
                    : t('sections.climate.plural')}
                </span>
              </div>
              {renderGrid(section.orderedIds)}
            </section>
          ))}
        </div>
      ) : null}
    </SummaryBarStack>
  );
});
