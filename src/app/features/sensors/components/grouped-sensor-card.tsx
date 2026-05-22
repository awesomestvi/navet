import { Gauge, Plus } from 'lucide-react';
import { memo } from 'react';
import { CardEmptyState } from '@/app/components/patterns';
import { BaseCard } from '@/app/components/primitives';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { useAreaRooms, useI18n, useTheme } from '@/app/hooks';
import { useDashboardWidgetRoomOptions } from '@/app/hooks/use-dashboard-widget-room-options';
import { SensorGroupSettingsDialog } from './sensor-group-settings';
import type { AvailableSensor } from './sensor-group-settings/types';
import {
  darkColorMap,
  GridSensorDisplay,
  iconMap,
  lightColorMap,
  type SensorReading,
  SmallSensorDisplay,
  useSensorGroup,
} from './sensors';

const GROUPED_SENSOR_MAX_SENSORS = 6;

interface GroupedSensorCardProps {
  id: string;
  name: string;
  room: string;
  sensors: SensorReading[];
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  accentColor?: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';
  availableSensors?: AvailableSensor[];
  emptyText?: string;
  showRoomSelector?: boolean;
  onNameChange?: (name: string) => void;
  onRoomChange?: (room: string) => void;
  onSensorsUpdate?: (sensors: SensorReading[]) => void;
}

export const GroupedSensorCard = memo(function GroupedSensorCard({
  id,
  name,
  room,
  sensors,
  size,
  onSizeChange: _onSizeChange,
  accentColor = 'teal',
  availableSensors,
  emptyText,
  showRoomSelector = true,
  onNameChange,
  onRoomChange,
  onSensorsUpdate,
}: GroupedSensorCardProps) {
  const {
    selectedSensors,
    isSettingsOpen,
    setIsSettingsOpen,
    handleSensorsUpdate,
    visibleSensors,
  } = useSensorGroup({ initialSensors: sensors, maxSensors: GROUPED_SENSOR_MAX_SENSORS });
  const { theme } = useTheme();
  const { t } = useI18n();
  const rooms = useAreaRooms();
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const cardShell = getCardShellSurfaceTokens(theme);

  // Size-specific styling with intelligent layout adaptation
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const colors = theme !== 'light' ? darkColorMap[accentColor] : lightColorMap[accentColor];
  const shell = getAccentCardShellTokens(theme, accentColor);
  const emptyAccentColor = {
    amber: '#f59e0b',
    blue: '#3b82f6',
    emerald: '#10b981',
    purple: '#a855f7',
    teal: '#14b8a6',
  }[accentColor];
  const readableText = getCardReadableTextTokens({
    theme,
    tone: accentColor,
    baseColor: emptyAccentColor,
  });

  // Get primary icon (first sensor's icon or default)
  const PrimaryIcon = selectedSensors[0]?.icon ? iconMap[selectedSensors[0].icon] : Gauge;

  const handleSettingsSensorsUpdate = (newSensors: SensorReading[]) => {
    handleSensorsUpdate(newSensors);
    onSensorsUpdate?.(newSensors);
  };
  const isEmpty = visibleSensors.length === 0;

  return (
    <div className="h-full w-full relative">
      <BaseCard
        size={size}
        className="text-left"
        frameClassName={`${cardShell.rootFrameClassName} ${shell.containerClassName}`}
        disableDefaultSheen
        overlay={
          <>
            <div className={`absolute inset-0 ${shell.glowClassName}`} />
            {shell.overlayClassName ? (
              <div className={`absolute inset-0 ${shell.overlayClassName}`} />
            ) : null}
          </>
        }
        contentClassName="h-full"
      >
        <div className="relative h-full flex flex-col">
          {isEmpty ? null : (
            <CardSettingsActionButton
              theme={theme}
              size={size === 'small' ? 'small' : 'medium'}
              variant="soft"
              accentColor={emptyAccentColor}
              className="absolute right-0 top-0 z-[3]"
              onClick={(event) => {
                event.stopPropagation();
                setIsSettingsOpen(true);
              }}
              aria-label={t('entityCardInteraction.openSettings', { name })}
            />
          )}
          {isEmpty ? null : (
            <EntityCardHeader
              title={name}
              subtitle={t('widgets.common.widget')}
              layout="eyebrow-first"
              size={size}
              tone={accentColor}
              leading={
                <EntityCardHeaderIcon
                  IconComponent={PrimaryIcon}
                  isActive={true}
                  size={size}
                  tone={accentColor}
                />
              }
            />
          )}

          {/* Sensor Grid */}
          <div className="flex-1 flex items-end min-h-0">
            {isEmpty ? (
              <CardEmptyState
                title={emptyText ?? t('sensors.group.emptyState')}
                description={t('sensors.group.emptyDescription')}
                icon={Gauge}
                actionLabel={t('sensors.groupSettings.addSensors')}
                onAction={() => setIsSettingsOpen(true)}
                actionIcon={Plus}
                size={size}
                accentColor={emptyAccentColor}
              />
            ) : isSmall || isMedium ? (
              <SmallSensorDisplay
                sensors={visibleSensors}
                textPrimaryColor={readableText.titleColor}
                textSecondaryColor={readableText.subtitleColor}
                size={isMedium ? 'medium' : 'small'}
              />
            ) : (
              <GridSensorDisplay
                sensors={visibleSensors}
                textPrimaryColor={readableText.titleColor}
                textSecondaryColor={readableText.subtitleColor}
                accentColor={emptyAccentColor}
                colors={colors}
                isMedium={isMedium}
              />
            )}
          </div>
        </div>
      </BaseCard>

      {isSettingsOpen ? (
        <SensorGroupSettingsDialog
          entityId={id}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          groupName={name}
          roomValue={roomValue}
          roomLabel={roomLabel}
          roomOptions={roomOptions}
          currentSensors={selectedSensors}
          maxSensors={GROUPED_SENSOR_MAX_SENSORS}
          accentColor={accentColor}
          availableSensors={availableSensors}
          showRoomSelector={showRoomSelector}
          onNameChange={onNameChange}
          onRoomChange={onRoomChange}
          onSensorsUpdate={handleSettingsSensorsUpdate}
        />
      ) : null}
    </div>
  );
});
