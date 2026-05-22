import { memo, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { EnergyNowCardView, useEnergyDashboard, useEnergyLoadHistory } from '@/app/features/energy';
import { useAreaRooms, useI18n, useTheme } from '@/app/hooks';
import { EnergyNowSettingsDialog, type EnergySourceOption } from './energy-now-settings-dialog';
import { EnergyNowStatusWidget } from './energy-now-status-widget';
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

  if (!isConnected) {
    return <EnergyNowStatusWidget message={t('network.disconnectedDescription')} />;
  }

  if (!isConfigured) {
    return <EnergyNowStatusWidget message={t('energy.setup.panelDescription')} />;
  }

  return (
    <>
      {onUpdate ? (
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

      <EnergyNowSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        options={sourceOptions}
        selectedSourceId={selectedOption?.id}
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
    </>
  );
});

export type { EnergySourceOption };
export { EnergyNowSettingsDialog };
