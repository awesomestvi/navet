import { Component, lazy, type ReactNode, Suspense, useMemo } from 'react';
import { BaseCard } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { RSSCardData } from '@/app/features/rss';
import {
  buildAvailableSensorOptions,
  GroupedSensorCard,
  resolveSensorReadings,
  type SensorReading,
} from '@/app/features/sensors';
import { useHomeAssistant } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { CustomCard } from '../stores/custom-cards-store';
import { useCustomCardsStore } from '../stores/custom-cards-store';
import type { BatteryOverviewWidgetData } from './widgets/battery-overview-widget';
import type { EnergyNowWidgetData } from './widgets/energy-now-dashboard-widget';
import type { MapMarker } from './widgets/map-types';
import type { PhotoFrameSourceMode } from './widgets/photo-frame-types';

class WidgetErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <BaseCard size="medium" className="bg-white/5 text-xs text-white/40">
          <div className="flex h-full items-center justify-center">Widget failed to load</div>
        </BaseCard>
      );
    }
    return this.props.children;
  }
}

const NoteWidget = lazy(async () => {
  const module = await import('./widgets/note-widget');
  return { default: module.NoteWidget };
});

const PhotoFrameWidget = lazy(async () => {
  const module = await import('./widgets/photo-frame-widget');
  return { default: module.PhotoFrameWidget };
});

const BatteryOverviewWidget = lazy(async () => {
  const module = await import('./widgets/battery-overview-widget');
  return { default: module.BatteryOverviewWidget };
});

const EnergyNowDashboardWidget = lazy(async () => {
  const module = await import('./widgets/energy-now-dashboard-widget');
  return { default: module.EnergyNowDashboardWidget };
});

const ButtonWidget = lazy(async () => {
  const module = await import('./widgets/button-widget');
  return { default: module.ButtonWidget };
});

const MapWidget = lazy(async () => {
  const module = await import('./widgets/map-widget');
  return { default: module.MapWidget };
});

const RSSFeedCard = lazy(async () => {
  const module = await import('@/app/features/rss');
  return { default: module.RSSFeedCard };
});

function isMapMarker(value: unknown): value is MapMarker {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const marker = value as Partial<MapMarker>;
  return (
    typeof marker.id === 'string' &&
    typeof marker.name === 'string' &&
    typeof marker.latitude === 'number' &&
    typeof marker.longitude === 'number' &&
    typeof marker.state === 'string'
  );
}

interface WidgetCardProps {
  card: CustomCard;
  isEditMode: boolean;
  onUpdate?: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
}

type SensorGroupWidgetData = {
  name?: string;
  sensorEntityIds?: string[];
  accentColor?: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';
};

const EMPTY_SENSOR_ENTITY_IDS: string[] = [];

function WidgetFallback({ size }: { size: CardSize }) {
  return (
    <BaseCard size={size} className="animate-pulse bg-white/5">
      <span />
    </BaseCard>
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function SensorGroupWidget({
  card,
  isEditMode,
  onUpdate,
}: {
  card: CustomCard;
  isEditMode: boolean;
  onUpdate: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
}) {
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const data = card.data as SensorGroupWidgetData | undefined;
  const sensorEntityIds = isStringArray(data?.sensorEntityIds)
    ? data.sensorEntityIds
    : EMPTY_SENSOR_ENTITY_IDS;
  const sensors = useMemo(
    () => resolveSensorReadings({ entities, sensorEntityIds }),
    [entities, sensorEntityIds]
  );
  const availableSensors = useMemo(
    () =>
      buildAvailableSensorOptions({
        entities,
        areas,
        deviceRegistry,
        entityRegistry,
      }),
    [areas, deviceRegistry, entities, entityRegistry]
  );
  const accentColor = data?.accentColor ?? 'teal';
  const name = data?.name ?? 'Sensor group';

  const handleSensorsUpdate = (nextSensors: SensorReading[]) => {
    onUpdate(card.id, {
      data: {
        ...card.data,
        sensorEntityIds: nextSensors.map((sensor) => sensor.id),
      },
    });
  };
  const handleNameChange = (nextName: string) => {
    onUpdate(card.id, {
      data: {
        ...card.data,
        name: nextName,
      },
    });
  };

  return (
    <GroupedSensorCard
      id={card.id}
      name={name}
      room={card.room}
      sensors={sensors}
      size={card.size}
      onSizeChange={() => {}}
      isEditMode={isEditMode}
      accentColor={accentColor}
      availableSensors={availableSensors}
      showRoomSelector
      onNameChange={handleNameChange}
      onRoomChange={(room) => onUpdate(card.id, { room })}
      onSensorsUpdate={handleSensorsUpdate}
    />
  );
}

export function WidgetCard({ card, isEditMode, onUpdate }: WidgetCardProps) {
  const updateCustomCard = useCustomCardsStore((state) => state.updateCard);
  const handleCardUpdate = onUpdate ?? updateCustomCard;

  const handleNoteChange = (note: string) => {
    handleCardUpdate(card.id, { data: { ...card.data, note } });
  };

  let widgetContent: React.ReactNode;
  switch (card.type) {
    case 'rss':
      widgetContent = (
        <RSSFeedCard
          cardId={card.id}
          inEditMode={isEditMode}
          size={card.size}
          room={card.room}
          data={card.data as RSSCardData | undefined}
          onRoomChange={(room) => handleCardUpdate(card.id, { room })}
          onDataChange={(data) => handleCardUpdate(card.id, { data: { ...card.data, ...data } })}
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
        />
      );
      break;
    case 'photo':
      widgetContent = (
        <PhotoFrameWidget
          size={card.size}
          room={card.room}
          onRoomChange={(room) => handleCardUpdate(card.id, { room })}
          sourceMode={card.data?.sourceMode as PhotoFrameSourceMode | undefined}
          photoUrls={card.data?.photoUrls as string[] | undefined}
          mediaSourceId={card.data?.mediaSourceId as string | undefined}
          shuffleEnabled={(card.data?.shuffleEnabled as boolean | undefined) ?? true}
          onUpdateUrls={(urls) =>
            handleCardUpdate(card.id, { data: { ...card.data, photoUrls: urls } })
          }
          onSourceModeChange={(sourceMode) =>
            handleCardUpdate(card.id, { data: { ...card.data, sourceMode } })
          }
          onMediaSourceIdChange={(mediaSourceId) =>
            handleCardUpdate(card.id, { data: { ...card.data, mediaSourceId } })
          }
          onShuffleEnabledChange={(shuffleEnabled) =>
            handleCardUpdate(card.id, { data: { ...card.data, shuffleEnabled } })
          }
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
          isEditMode={isEditMode}
        />
      );
      break;
    case 'note':
      widgetContent = (
        <NoteWidget
          initialNote={card.data?.note as string}
          onNoteChange={handleNoteChange}
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
        />
      );
      break;
    case 'battery':
      widgetContent = (
        <BatteryOverviewWidget
          size={card.size}
          room={card.room}
          onRoomChange={(room) => handleCardUpdate(card.id, { room })}
          data={card.data as BatteryOverviewWidgetData | undefined}
          onUpdate={(data) => handleCardUpdate(card.id, { data: { ...card.data, ...data } })}
          isEditMode={isEditMode}
        />
      );
      break;
    case 'energy-now':
      widgetContent = (
        <EnergyNowDashboardWidget
          size={card.size}
          room={card.room}
          onRoomChange={(room) => handleCardUpdate(card.id, { room })}
          data={card.data as EnergyNowWidgetData | undefined}
          onUpdate={(data) => handleCardUpdate(card.id, { data: { ...card.data, ...data } })}
          isEditMode={isEditMode}
        />
      );
      break;
    case 'button':
      widgetContent = (
        <ButtonWidget
          data={
            card.data as
              | {
                  label?: string;
                  service?: string;
                  entityId?: string;
                  icon?: string;
                  serviceData?: Record<string, unknown>;
                }
              | undefined
          }
          onUpdate={(data) => handleCardUpdate(card.id, { data: { ...card.data, ...data } })}
          isEditMode={isEditMode}
        />
      );
      break;
    case 'map':
      widgetContent = (
        <MapWidget
          size={card.size}
          tintColor={card.data?.tintColor as string | undefined}
          markers={
            Array.isArray(card.data?.markers) ? card.data.markers.filter(isMapMarker) : undefined
          }
        />
      );
      break;
    case 'sensor-group':
      widgetContent = (
        <SensorGroupWidget card={card} isEditMode={isEditMode} onUpdate={handleCardUpdate} />
      );
      break;
    default:
      widgetContent = null;
  }

  return (
    <div className="relative h-full">
      <WidgetErrorBoundary>
        <Suspense fallback={<WidgetFallback size={card.size} />}>{widgetContent}</Suspense>
      </WidgetErrorBoundary>
    </div>
  );
}
