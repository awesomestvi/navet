import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  type AccentColor,
  GroupedSensorCard,
  InfoCard,
  SensorGroupSettingsDialog,
  type SensorReading,
} from '@navet/app/features/sensors';
import { useSensorStatisticsHistory } from '@navet/app/features/sensors/hooks/use-sensor-statistics-history';
import { useAreaRooms, useI18n } from '@navet/app/hooks';
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
  const rooms = useAreaRooms();
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const sensorEntityIds = getSensorEntityIds(data);
  const { availableSensors, currentSensors } = useProviderInfoWidgetData(sensorEntityIds, {
    includeBinarySensors: true,
    use24HourTime,
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
            accentColor="#38bdf8"
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
            maxSensors={MAX_INFO_WIDGET_SENSORS}
            accentColor={accentColor}
            availableSensors={availableSensors}
            showRoomSelector
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
          showRoomSelector
          onNameChange={handleNameChange}
          onRoomChange={onRoomChange}
          onSensorsUpdate={handleSensorsUpdate}
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
          maxSensors={MAX_INFO_WIDGET_SENSORS}
          accentColor={accentColor}
          availableSensors={availableSensors}
          showRoomSelector
          onNameChange={handleNameChange}
          onRoomChange={onRoomChange}
          onSensorsUpdate={handleSensorsUpdate}
        />
      ) : null}
    </>
  );
}
