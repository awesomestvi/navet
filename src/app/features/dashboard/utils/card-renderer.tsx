import type { ReactElement } from 'react';
import { CardErrorBoundary } from '@/app/components/shared/card-error-boundary';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { CalendarCard } from '@/app/features/calendar';
import { HVACCard } from '@/app/features/climate';
import { LightCard, SwitchCard } from '@/app/features/lighting';
import { MediaCard } from '@/app/features/media';
import { PersonCard } from '@/app/features/person';
import { SceneCard } from '@/app/features/scenes';
import { CameraCard, CoverCard, LockCard } from '@/app/features/security';
import { GroupedSensorCard, SensorCard, type SensorReading } from '@/app/features/sensors';
import { VacuumCard } from '@/app/features/vacuum';
import { WeatherCard } from '@/app/features/weather';
import type { DeviceMetric } from '@/app/types/device.types';

interface DeviceData {
  id: string;
  type: string;
  [key: string]: string | number | boolean | object | undefined;
}

interface CardRendererOptions {
  device: DeviceData;
  size: CardSize;
  handleSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

type CardRenderFn = (options: CardRendererOptions) => ReactElement | null;

const cardRegistry: Partial<Record<string, CardRenderFn>> = {
  lights: ({ device, size, handleSizeChange, isEditMode }) => (
    <LightCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      initialState={device.state as boolean | undefined}
      initialBrightness={device.brightness as number | undefined}
      initialTemp={device.temp as number | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  hvac: ({ device, size, handleSizeChange, isEditMode }) => (
    <HVACCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      initialTemp={device.temp as number | undefined}
      initialMode={device.mode as string | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  climate: ({ device, size, handleSizeChange, isEditMode }) => (
    <HVACCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      initialTemp={device.temperature as number | undefined}
      initialCurrentTemp={device.currentTemperature as number | undefined}
      initialMode={device.mode as string | undefined}
      initialAction={device.action as string | undefined}
      initialState={(device.mode as string | undefined) !== 'off'}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  media: ({ device, size, handleSizeChange, isEditMode }) => (
    <MediaCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      title={device.title as string}
      artist={device.artist as string}
      entityType={device.entityType as string | undefined}
      entityPicture={device.entityPicture as string | undefined}
      state={device.state as 'playing' | 'paused' | 'idle' | 'off'}
      volume={device.volume as number}
      isMuted={device.isMuted as boolean}
      elapsedSeconds={device.elapsedSeconds as number | undefined}
      durationSeconds={device.durationSeconds as number | undefined}
      positionUpdatedAt={device.positionUpdatedAt as string | undefined}
      supportsGrouping={device.supportsGrouping as boolean | undefined}
      groupMembers={device.groupMembers as string[] | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  weather: ({ device, size, isEditMode }) => (
    <WeatherCard
      id={device.id as string}
      location={device.location as string}
      temperature={device.temperature as number}
      condition={device.condition as string}
      humidity={device.humidity as number}
      windSpeed={device.windSpeed as number}
      precipitation={device.precipitation as number}
      precipitationUnit={device.precipitationUnit as string}
      sunrise={device.sunrise as string}
      sunset={device.sunset as string}
      daylight={device.daylight as string}
      rainForecast={device.rainForecast as string}
      forecast={
        (device.forecast as Array<{
          day: string;
          condition: string;
          high: number;
          low: number;
        }>) ?? []
      }
      forecastMode={(device.forecastMode as 'weekly' | 'hourly' | undefined) ?? 'weekly'}
      highTemp={device.highTemp as number}
      lowTemp={device.lowTemp as number}
      size={size}
      onSizeChange={() => {}}
      isEditMode={isEditMode}
    />
  ),

  switches: ({ device, size, isEditMode }) => (
    <SwitchCard
      id={device.id as string}
      name={device.name as string}
      size={size}
      initialState={device.state as boolean | undefined}
      entityType={device.entityType as string | undefined}
      serviceDomain={device.serviceDomain as string | undefined}
      serviceAction={device.serviceAction as string | undefined}
      power={device.power as number | undefined}
      voltage={device.voltage as number | undefined}
      energy={device.energy as number | undefined}
      metrics={device.metrics as DeviceMetric[] | undefined}
      isEditMode={isEditMode}
    />
  ),

  helpers: ({ device, size, isEditMode }) => (
    <SwitchCard
      id={device.id as string}
      name={device.name as string}
      size={size}
      initialState={device.state as boolean | undefined}
      entityType={device.entityType as string | undefined}
      serviceDomain={device.serviceDomain as string | undefined}
      serviceAction={device.serviceAction as string | undefined}
      isEditMode={isEditMode}
    />
  ),

  covers: ({ device, size, handleSizeChange, isEditMode }) => (
    <CoverCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      initialPosition={device.position as number | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  locks: ({ device, size, isEditMode }) => (
    <LockCard
      id={device.id as string}
      name={device.name as string}
      initialState={device.state as boolean | undefined}
      size={size}
      isEditMode={isEditMode}
    />
  ),

  scenes: ({ device, size, handleSizeChange, isEditMode }) => (
    <SceneCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  cameras: ({ device, size, handleSizeChange, isEditMode }) => (
    <CameraCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      entityPicture={device.entityPicture as string | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  persons: ({ device, size, handleSizeChange, isEditMode }) => (
    <PersonCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      location={device.location as string}
      state={device.state as 'home' | 'away'}
      entityPicture={device.entityPicture as string | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  sensors: ({ device, size, handleSizeChange, isEditMode }) => (
    <SensorCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      value={device.value as string}
      unit={device.unit as string}
      icon={device.icon as 'gauge' | 'trend-up' | 'trend-down' | undefined}
      subtitle={device.entityType as string | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  'grouped-sensors': ({ device, size, handleSizeChange, isEditMode }) => (
    <GroupedSensorCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      sensors={device.sensors as SensorReading[]}
      accentColor={
        device.accentColor as 'teal' | 'blue' | 'purple' | 'amber' | 'emerald' | undefined
      }
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  vacuums: ({ device, size, handleSizeChange, isEditMode }) => (
    <VacuumCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      status={device.status as 'cleaning' | 'returning' | 'docked' | 'paused' | 'idle'}
      battery={device.battery as number}
      cleanedArea={device.cleanedArea as string | undefined}
      cleaningTime={device.cleaningTime as string | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  calendars: ({ device, size, handleSizeChange, isEditMode }) => (
    <CalendarCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      events={
        (device.events as Array<{
          id: string;
          title: string;
          startTime: string;
          endTime: string;
          timeDisplay: string;
          location?: string;
          type: 'meeting' | 'call' | 'event';
          color: string;
          attendees?: number;
        }>) ?? []
      }
      inEditMode={isEditMode}
      size={size}
      onSizeChange={(newSize) => handleSizeChange(device.id, newSize)}
    />
  ),
};

export const DASHBOARD_CARD_TYPES = Object.freeze(Object.keys(cardRegistry));

export const renderCard = (options: CardRendererOptions): ReactElement | null => {
  const renderer = cardRegistry[options.device.type];
  if (!renderer) return null;
  const card = renderer(options);
  if (!card) return null;
  return <CardErrorBoundary>{card}</CardErrorBoundary>;
};
