import { Settings2, Zap } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { CardEmptyState } from '@/app/components/patterns';
import { BaseCard } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { EnergyNowCardView, useEnergyDashboard, useEnergyLoadHistory } from '@/app/features/energy';
import { useAreaRooms, useI18n, useTheme } from '@/app/hooks';
import { EnergyNowSettingsDialog, type EnergySourceOption } from './energy-now-settings-dialog';
import { useDashboardWidgetRoomOptions } from './use-widget-room-options';

interface EnergyNowDashboardWidgetProps {
  size?: CardSize;
  data?: EnergyNowWidgetData;
  onUpdate?: (data: EnergyNowWidgetData) => void;
  isEditMode?: boolean;
  room?: string;
  onRoomChange?: (room: string) => void;
}

export interface EnergyNowWidgetData {
  selectedSourceId?: string;
  tintColor?: string;
}

function getSelectedSourceId(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export const EnergyNowDashboardWidget = memo(function EnergyNowDashboardWidget({
  size = 'medium',
  data,
  onUpdate,
  room,
  onRoomChange,
}: EnergyNowDashboardWidgetProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const rooms = useAreaRooms();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { overview, currentLoadStatisticId, todayTotalUsageKWh, isConnected, isConfigured } =
    useEnergyDashboard();
  const selectedSourceId = getSelectedSourceId(data?.selectedSourceId);
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);

  const sourceOptions = useMemo(() => {
    const options: EnergySourceOption[] = [
      {
        id: 'home-load',
        name: t('widgets.energyNow.settings.home'),
        currentPowerW: overview.totals.currentLoadW,
        todayUsageKWh: todayTotalUsageKWh,
        trendEntityId: currentLoadStatisticId,
        group: 'home',
      },
    ];

    if (overview.totals.solarTodayKWh > 0 || overview.totals.solarW > 0) {
      options.push({
        id: 'solar',
        name: t('energy.widgets.status.solarGenerated'),
        currentPowerW: overview.totals.solarW,
        todayUsageKWh: overview.totals.solarTodayKWh,
        group: 'sources',
      });
    }

    if (overview.totals.importTodayKWh > 0 || overview.totals.importW > 0) {
      options.push({
        id: 'grid-import',
        name: t('energy.stats.gridImport'),
        currentPowerW: overview.totals.importW,
        todayUsageKWh: overview.totals.importTodayKWh,
        group: 'sources',
      });
    }

    for (const consumer of overview.topConsumers) {
      options.push({
        id: `device:${consumer.id}`,
        name: consumer.name,
        currentPowerW: consumer.powerW,
        todayUsageKWh: consumer.energyKWh,
        trendEntityId: consumer.powerEntityId,
        group: 'devices',
      });
    }

    return options;
  }, [currentLoadStatisticId, overview, t, todayTotalUsageKWh]);

  const selectedOption =
    sourceOptions.find((option) => option.id === selectedSourceId) ?? sourceOptions[0] ?? null;
  const selectedTrend = useEnergyLoadHistory(
    selectedOption?.trendEntityId,
    selectedOption?.currentPowerW ?? overview.totals.currentLoadW
  );
  const isCustomCard = Boolean(onUpdate);
  const settingsDialog = (
    <EnergyNowSettingsDialog
      isOpen={isSettingsOpen}
      onOpenChange={setIsSettingsOpen}
      options={sourceOptions}
      selectedSourceId={selectedSourceId}
      onSelectionChange={(nextSelectedSourceId) =>
        onUpdate?.({ selectedSourceId: nextSelectedSourceId })
      }
      roomValue={roomValue}
      roomLabel={roomLabel}
      roomOptions={roomOptions}
      onRoomChange={onRoomChange}
      tintColor={tintColor}
      onTintColorChange={(nextTintColor) =>
        onUpdate?.({ ...(data ?? {}), tintColor: nextTintColor })
      }
      theme={theme}
    />
  );
  const renderEmptyCard = (description: string, withSettingsAction = true) => (
    <BaseCard
      size={size}
      fullBleed
      className="transition-all duration-500"
      style={tintSurface.panelStyle}
      frameClassName="overflow-hidden"
      overlay={
        <>
          {tintSurface.glowStyle ? (
            <div className="pointer-events-none absolute inset-0" style={tintSurface.glowStyle} />
          ) : null}
          {tintSurface.overlayClassName ? (
            <div
              className={`pointer-events-none absolute inset-0 ${tintSurface.overlayClassName}`}
            />
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      <div className="relative z-[2] h-full p-4">
        <CardEmptyState
          title={t('dashboard.addCard.templates.energyNow.name')}
          description={description}
          icon={Zap}
          actionLabel={withSettingsAction ? t('widgets.energyNow.settings.sources') : undefined}
          onAction={withSettingsAction ? () => setIsSettingsOpen(true) : undefined}
          actionIcon={withSettingsAction ? Settings2 : undefined}
          size={size}
          accentColor={tintColor ?? accentColor}
        />
      </div>
    </BaseCard>
  );

  if (!isConnected) {
    return renderEmptyCard(t('network.disconnectedDescription'), false);
  }

  if (!isConfigured) {
    if (isCustomCard) {
      return (
        <>
          {renderEmptyCard(t('energy.setup.panelTitle'))}
          {settingsDialog}
        </>
      );
    }
    return renderEmptyCard(t('energy.setup.panelDescription'), false);
  }

  const isEmpty = isCustomCard ? !selectedSourceId : false;

  return (
    <>
      {isEmpty ? (
        renderEmptyCard(t('widgets.energyNow.settings.sources'))
      ) : onUpdate ? (
        <button
          type="button"
          className="h-full w-full cursor-pointer text-left"
          onClick={() => setIsSettingsOpen(true)}
        >
          <EnergyNowCardView
            title={selectedOption?.name ?? t('widgets.energyNow.settings.home')}
            subtitle={t('widgets.common.widget')}
            currentLoadW={selectedOption?.currentPowerW ?? overview.totals.currentLoadW}
            todayUsageKWh={selectedOption?.todayUsageKWh ?? todayTotalUsageKWh}
            trend={selectedTrend}
            accentColor={accentColor}
            size={size}
            tintColor={tintColor}
          />
        </button>
      ) : (
        <EnergyNowCardView
          title={selectedOption?.name ?? t('widgets.energyNow.settings.home')}
          subtitle={t('widgets.common.widget')}
          currentLoadW={selectedOption?.currentPowerW ?? overview.totals.currentLoadW}
          todayUsageKWh={selectedOption?.todayUsageKWh ?? todayTotalUsageKWh}
          trend={selectedTrend}
          accentColor={accentColor}
          size={size}
          tintColor={tintColor}
        />
      )}

      {settingsDialog}
    </>
  );
});

export type { EnergySourceOption };
export { EnergyNowSettingsDialog };
