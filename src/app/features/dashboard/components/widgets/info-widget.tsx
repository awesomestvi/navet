import { Gauge, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardEmptyState } from '@/app/components/patterns';
import { BaseCard } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import {
  type AccentColor,
  buildAvailableSensorOptions,
  GroupedSensorCard,
  InfoCard,
  resolveSensorReadings,
  SensorGroupSettingsDialog,
  type SensorReading,
} from '@/app/features/sensors';
import { useSensorStatisticsHistory } from '@/app/features/sensors/hooks/use-sensor-statistics-history';
import { useAreaRooms, useI18n } from '@/app/hooks';
import { useDashboardWidgetRoomOptions } from '@/app/hooks/use-dashboard-widget-room-options';
import { useProviderRuntime } from '@/app/hooks/use-provider-runtime';
import { providerRuntimeSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';

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

export function InfoWidget({ cardId, size, room, data, onRoomChange, onUpdate }: InfoWidgetProps) {
  const { t, locale } = useI18n();
  const rooms = useAreaRooms();
  const entities = useProviderRuntime(providerRuntimeSelectors.entities);
  const areas = useProviderRuntime(providerRuntimeSelectors.areas);
  const deviceRegistry = useProviderRuntime(providerRuntimeSelectors.deviceRegistry);
  const entityRegistry = useProviderRuntime(providerRuntimeSelectors.entityRegistry);
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const formatOptions = useMemo(() => ({ locale, use24HourTime }), [locale, use24HourTime]);
  const availableSensors = useMemo(
    () =>
      buildAvailableSensorOptions({
        entities,
        areas,
        deviceRegistry,
        entityRegistry,
        formatOptions,
        includeBinarySensors: true,
      }),
    [areas, deviceRegistry, entities, entityRegistry, formatOptions]
  );
  const sensorEntityIds = getSensorEntityIds(data);
  const currentSensors = useMemo<SensorReading[]>(
    () =>
      resolveSensorReadings({
        entities,
        sensorEntityIds,
        formatOptions,
      }),
    [entities, formatOptions, sensorEntityIds]
  );
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
