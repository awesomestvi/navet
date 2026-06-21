import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { ENERGY_WIDGET_ROOM } from '@navet/app/constants/rooms';
import { GroupedSensorCard } from '@navet/app/features/sensors/components/grouped-sensor-card';
import { InfoCard } from '@navet/app/features/sensors/components/sensor-card';
import { SensorGroupSettingsContainer as SensorGroupSettingsDialog } from '@navet/app/features/sensors/components/sensor-group-settings/container';
import type { AvailableSensor } from '@navet/app/features/sensors/components/sensor-group-settings/types';
import type { AccentColor, SensorReading } from '@navet/app/features/sensors/components/sensors';
import { useSensorStatisticsHistory } from '@navet/app/features/sensors/hooks/use-sensor-statistics-history';
import { useAreaRooms, useI18n, useTheme } from '@navet/app/hooks';
import { useDashboardWidgetRoomOptions } from '@navet/app/hooks/use-dashboard-widget-room-options';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { Gauge, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  type ProviderInfoWidgetDataResult,
  useProviderInfoWidgetData,
} from './use-provider-info-widget-data';

const MAX_INFO_WIDGET_SENSORS = 6;
const EMPTY_SENSOR_ENTITY_IDS: string[] = [];

export interface InfoWidgetData {
  entityId?: string;
  sensorEntityIds?: string[];
  name?: string;
  accentColor?: AccentColor;
  sensorCategoryFilter?: AvailableSensor['category'];
}

interface InfoWidgetProps {
  cardId: string;
  size: CardSize;
  room: string;
  data?: InfoWidgetData;
  onRoomChange?: (room: string) => void;
  onUpdate?: (data: InfoWidgetData) => void;
  isEditMode?: boolean;
  openSettingsRequestKey?: number;
}

function getSensorEntityIds(data: InfoWidgetData | undefined) {
  const selectedIds =
    Array.isArray(data?.sensorEntityIds) && data.sensorEntityIds.length > 0
      ? data.sensorEntityIds.filter((value): value is string => typeof value === 'string')
      : [];

  if (selectedIds.length > 0) {
    return selectedIds;
  }

  return typeof data?.entityId === 'string' ? [data.entityId] : EMPTY_SENSOR_ENTITY_IDS;
}

export function InfoWidget({
  cardId,
  size,
  room,
  data,
  onRoomChange,
  onUpdate,
  openSettingsRequestKey = 0,
}: InfoWidgetProps) {
  const { t } = useI18n();
  const { primaryColor } = useTheme();
  const rooms = useAreaRooms();
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const showRoomSelector = room !== ENERGY_WIDGET_ROOM;
  const sensorEntityIds = getSensorEntityIds(data);
  const { availableSensors, currentSensors } = useProviderInfoWidgetData(sensorEntityIds, {
    includeBinarySensors: true,
    use24HourTime,
    availableSensorCategoryFilter: data?.sensorCategoryFilter,
  }) as {
    availableSensors: ProviderInfoWidgetDataResult['availableSensors'];
    currentSensors: SensorReading[];
  };
  const primaryEntityId = currentSensors[0]?.id;
  const { points: sparklineData, hasHistory } = useSensorStatisticsHistory(primaryEntityId);
  const primarySensor = primaryEntityId
    ? availableSensors.find((sensor) => sensor.id === primaryEntityId)
    : undefined;
  const accentColor = data?.accentColor ?? (currentSensors.length > 1 ? 'teal' : 'blue');
  const emptyTitle = t('dashboard.addCard.templates.info.name');
  const emptyDescription = t('dashboard.addCard.templates.info.description');
  const defaultCardName = t('dashboard.addCard.templates.info.name');
  const usesSingleSensorPicker = data?.sensorCategoryFilter === 'energy';
  const maxSelectableSensors = usesSingleSensorPicker ? 1 : MAX_INFO_WIDGET_SENSORS;
  const resolvedCardName =
    data?.name?.trim() ||
    (currentSensors.length === 1
      ? (primarySensor?.label ?? currentSensors[0]?.label)
      : defaultCardName) ||
    defaultCardName;

  const handleSensorsUpdate = (sensors: SensorReading[]) => {
    onUpdate?.({
      ...(data ?? {}),
      sensorEntityIds: sensors.map((sensor) => sensor.id),
    });
  };

  const handleNameChange = (name: string) => {
    onUpdate?.({
      ...(data ?? {}),
      name,
    });
  };

  useEffect(() => {
    if (openSettingsRequestKey > 0) {
      setIsSettingsOpen(true);
    }
  }, [openSettingsRequestKey]);

  if (currentSensors.length === 0) {
    return (
      <>
        <BaseCard size={size}>
          <CardEmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={Gauge}
            actionLabel={t('common.customize')}
            actionIcon={Plus}
            onAction={() => setIsSettingsOpen(true)}
            size={size}
            accentColor={getThemeColorValue(primaryColor)}
          />
        </BaseCard>

        {isSettingsOpen ? (
          <SensorGroupSettingsDialog
            entityId={cardId}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            groupName={resolvedCardName}
            roomValue={roomValue}
            roomLabel={roomLabel}
            roomOptions={roomOptions}
            currentSensors={[]}
            maxSensors={maxSelectableSensors}
            accentColor={accentColor}
            availableSensors={availableSensors}
            showRoomSelector={showRoomSelector}
            onNameChange={handleNameChange}
            onRoomChange={onRoomChange}
            onSensorsUpdate={handleSensorsUpdate}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {currentSensors.length === 1 ? (
        <InfoCard
          id={primaryEntityId ?? cardId}
          name={resolvedCardName}
          room={room}
          value={currentSensors[0]?.value ?? ''}
          unit={currentSensors[0]?.unit ?? ''}
          icon={currentSensors[0]?.icon}
          subtitle={currentSensors[0]?.entityType}
          size={size}
          onSizeChange={() => {}}
          isEditMode={false}
          onOpenSettings={() => setIsSettingsOpen(true)}
          disableBuiltInSettingsDialog
          sparklineData={hasHistory ? sparklineData : undefined}
        />
      ) : (
        <GroupedSensorCard
          id={cardId}
          name={resolvedCardName}
          room={room}
          sensors={currentSensors}
          size={size}
          onSizeChange={() => {}}
          isEditMode={false}
          accentColor={accentColor}
          availableSensors={availableSensors}
          showRoomSelector={showRoomSelector}
          onNameChange={handleNameChange}
          onRoomChange={onRoomChange}
          onSensorsUpdate={handleSensorsUpdate}
          onOpenSettings={() => setIsSettingsOpen(true)}
          disableBuiltInSettingsDialog
        />
      )}

      {isSettingsOpen ? (
        <SensorGroupSettingsDialog
          entityId={cardId}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          groupName={resolvedCardName}
          roomValue={roomValue}
          roomLabel={roomLabel}
          roomOptions={roomOptions}
          currentSensors={currentSensors}
          maxSensors={maxSelectableSensors}
          accentColor={accentColor}
          availableSensors={availableSensors}
          showRoomSelector={showRoomSelector}
          onNameChange={handleNameChange}
          onRoomChange={onRoomChange}
          onSensorsUpdate={handleSensorsUpdate}
        />
      ) : null}
    </>
  );
}
