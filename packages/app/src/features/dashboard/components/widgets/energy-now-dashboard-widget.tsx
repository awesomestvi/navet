import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getCustomCardTintSurface } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import {
  EnergyNowCardView,
  useEnergyLoadHistory,
  useProviderEnergyNow,
} from '@navet/app/features/energy';
import {
  useAreaRooms,
  useI18n,
  useIntegrationStore,
  useProviderFeature,
  useTheme,
} from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { INTEGRATION_PROVIDERS } from '@navet/app/types/provider';
import { Settings2, Zap } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
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
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const energyNow = useProviderEnergyNow();
  const supportsEnergyNow = useProviderFeature('energyNow');
  const selectedSourceId = getSelectedSourceId(data?.selectedSourceId);
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);

  const sourceOptions = useMemo(() => {
    return energyNow.sourceOptions.map<EnergySourceOption>((option) => ({
      ...option,
      name:
        option.id === 'home-load'
          ? t('widgets.energyNow.settings.home')
          : option.id === 'solar'
            ? t('energy.widgets.status.solarGenerated')
            : option.id === 'grid-import'
              ? t('energy.stats.gridImport')
              : option.name,
    }));
  }, [energyNow.sourceOptions, t]);

  const selectedOption =
    sourceOptions.find((option) => option.id === selectedSourceId) ?? sourceOptions[0] ?? null;
  const selectedTrend = useEnergyLoadHistory(
    selectedOption?.trendEntityId,
    selectedOption?.currentPowerW ?? energyNow.currentLoadW
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

  if (!supportsEnergyNow) {
    const providerLabel = INTEGRATION_PROVIDERS[currentProviderId].label;
    return renderEmptyCard(t('integration.featureUnavailable', { provider: providerLabel }), false);
  }

  if (!energyNow.isConnected) {
    return renderEmptyCard(
      t('network.disconnectedDescription', {
        provider: INTEGRATION_PROVIDERS[currentProviderId].label,
      }),
      false
    );
  }

  if (!energyNow.isConfigured) {
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
            currentLoadW={selectedOption?.currentPowerW ?? energyNow.currentLoadW}
            todayUsageKWh={selectedOption?.todayUsageKWh ?? energyNow.todayTotalUsageKWh}
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
          currentLoadW={selectedOption?.currentPowerW ?? energyNow.currentLoadW}
          todayUsageKWh={selectedOption?.todayUsageKWh ?? energyNow.todayTotalUsageKWh}
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
