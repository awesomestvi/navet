import { CardErrorBoundary } from '@navet/app/components/shared/card-error-boundary';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getBaseCardRadiusClassName } from '@navet/app/components/system/tokens';
import {
  readNavetCameraState,
  readNavetClimateState,
  readNavetCoverState,
  readNavetLockState,
  readNavetMediaState,
  readNavetPersonState,
  readNavetSensorState,
} from '@navet/app/core/navet-device-state';
import type { SensorReading } from '@navet/app/features/sensors/components/sensors';
import type { VacuumStatus } from '@navet/app/features/vacuum/components/vacuum/vacuum-utils';
import { useI18n, useIntegrationStore } from '@navet/app/hooks';
import { integrationSelectors, settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { DeviceMetric } from '@navet/app/types/device.types';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { areRecordValuesEqual } from '@navet/app/utils/structural-equality';
import type { NavetEntity } from '@navet/core/types';
import { lazy, type ReactElement, type ReactNode, Suspense, useMemo } from 'react';

interface DeviceData {
  id: string;
  type: string;
  [key: string]: string | number | boolean | string[] | object | undefined;
}

interface CardRendererOptions {
  device: DeviceData;
  size: CardSize;
  handleSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  headerSubtitleOverride?: string;
}

type CardRenderFn = (options: CardRendererOptions) => ReactElement | null;
type CardProviderId = IntegrationProviderId | undefined;

const CalendarCard = lazy(async () => {
  const module = await import('@navet/app/features/calendar');
  return { default: module.CalendarCard };
});

const HVACCard = lazy(async () => {
  const module = await import('@navet/app/features/climate');
  return { default: module.HVACCard };
});

const LightCard = lazy(async () => {
  const module = await import('@navet/app/features/lighting');
  return { default: module.LightCard };
});

const FanCard = lazy(async () => {
  const module = await import('@navet/app/features/lighting');
  return { default: module.FanCard };
});

const SwitchCard = lazy(async () => {
  const module = await import('@navet/app/features/lighting');
  return { default: module.SwitchCard };
});

const MediaCard = lazy(async () => {
  const module = await import('@navet/app/features/media');
  return { default: module.MediaCard };
});

const PersonCard = lazy(async () => {
  const module = await import('@navet/app/features/person');
  return { default: module.PersonCard };
});

const SceneCard = lazy(async () => {
  const module = await import('@navet/app/features/scenes');
  return { default: module.SceneCard };
});

const CameraCard = lazy(async () => {
  const module = await import('@navet/app/features/security');
  return { default: module.CameraCard };
});

const CoverCard = lazy(async () => {
  const module = await import('@navet/app/features/security');
  return { default: module.CoverCard };
});

const LockCard = lazy(async () => {
  const module = await import('@navet/app/features/security');
  return { default: module.LockCard };
});

const GroupedSensorCard = lazy(async () => {
  const module = await import('@navet/app/features/sensors');
  return { default: module.GroupedSensorCard };
});

const InfoCard = lazy(async () => {
  const module = await import('@navet/app/features/sensors');
  return { default: module.InfoCard };
});

const VacuumCard = lazy(async () => {
  const module = await import('@navet/app/features/vacuum');
  return { default: module.VacuumCard };
});

const WeatherCard = lazy(async () => {
  const module = await import('@navet/app/features/weather');
  return { default: module.WeatherCard };
});

function EntityCardFallback({ size }: { size: CardSize }) {
  return (
    <div
      className={`h-full w-full ${getBaseCardRadiusClassName(size)} border border-white/8 bg-white/5`}
      aria-hidden="true"
    />
  );
}

function readUnavailableState(device: DeviceData): string | undefined {
  const value = device.state;
  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

function readProviderEntityStateValue(
  entity: NonNullable<ReturnType<typeof resolveAvailabilityEntity>>
): string | undefined {
  switch (entity.type) {
    case 'camera':
      return readNavetCameraState(entity)?.value;
    case 'climate':
    case 'hvac':
      return readNavetClimateState(entity)?.value;
    case 'cover':
      return readNavetCoverState(entity)?.value;
    case 'lock':
      return readNavetLockState(entity)?.value;
    case 'media_player':
      return readNavetMediaState(entity)?.value;
    case 'person':
      return readNavetPersonState(entity)?.value;
    case 'sensor':
    case 'binary_sensor':
    case 'grouped_sensor':
    case 'energy':
    case 'unknown':
      return readNavetSensorState(entity)?.value;
    default:
      return typeof entity.attributes?.value === 'string'
        ? entity.attributes.value
        : typeof entity.primaryState === 'string'
          ? entity.primaryState
          : undefined;
  }
}

function resolveAvailabilityProviderId(
  deviceId: string,
  currentProviderId: ReturnType<typeof integrationSelectors.currentProviderId>
) {
  return parseProviderScopedId(deviceId)?.providerId ?? currentProviderId;
}

function resolveAvailabilityEntity(
  deviceId: string,
  availabilityEntitiesById: Record<string, NavetEntity | null>
): NavetEntity | null {
  return availabilityEntitiesById[deviceId] ?? null;
}

export function useAvailabilityEntitiesForCard(
  entityIds: string[],
  currentProviderId: ReturnType<typeof integrationSelectors.currentProviderId>
) {
  return useIntegrationStore(
    (state) =>
      Object.fromEntries(
        entityIds.map((entityId) => {
          const providerId = resolveAvailabilityProviderId(entityId, currentProviderId);
          return [
            entityId,
            integrationSelectors.providerEntityByLookup(providerId, entityId)(state),
          ];
        })
      ) as Record<string, NavetEntity | null>,
    areRecordValuesEqual
  );
}

function EntityAvailabilityFrame({
  device,
  isEditMode,
  children,
}: {
  device: DeviceData;
  isEditMode: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const shouldReducePaintEffects = effectsQuality !== 'high';
  const entityIds = useMemo(() => {
    const sourceIds = device.sourceIds;
    if (Array.isArray(sourceIds) && sourceIds.every((value) => typeof value === 'string')) {
      return sourceIds;
    }

    return typeof device.id === 'string' ? [device.id] : [];
  }, [device]);
  const availabilityEntitiesById = useAvailabilityEntitiesForCard(entityIds, currentProviderId);
  const entityStates = useMemo(
    () =>
      entityIds.map((entityId) => {
        const providerEntity = resolveAvailabilityEntity(entityId, availabilityEntitiesById);
        return providerEntity
          ? readProviderEntityStateValue(providerEntity)
          : readUnavailableState(device);
      }),
    [availabilityEntitiesById, device, entityIds]
  );
  const isUnavailable =
    entityIds.length > 0 &&
    entityStates.length === entityIds.length &&
    entityStates.every((state) => state === 'unavailable');

  if (!isUnavailable) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <div
        className={`pointer-events-none h-full w-full opacity-45 ${
          shouldReducePaintEffects ? '' : 'saturate-50'
        }`}
      >
        {children}
      </div>
      <div
        className={`pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-black/18 ${
          shouldReducePaintEffects ? '' : 'backdrop-blur-[1px]'
        }`}
      />
      {!isEditMode ? (
        <div className="pointer-events-auto absolute inset-0 z-20 rounded-[inherit]" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div
          className={`inline-flex items-center rounded-full border border-white/12 bg-black/45 px-2.5 py-1 text-xs font-semibold tracking-[0.06em] text-white/92 uppercase ${
            shouldReducePaintEffects ? '' : 'backdrop-blur-md'
          }`}
        >
          {t('camera.status.unavailable')}
        </div>
      </div>
    </div>
  );
}

const cardRegistry: Partial<Record<string, CardRenderFn>> = {
  lights: ({ device, size, handleSizeChange, isEditMode }) => (
    <LightCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      providerId={device.providerId as CardProviderId}
      initialState={device.state as boolean | undefined}
      initialBrightness={device.brightness as number | undefined}
      initialTemp={device.temp as number | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  fans: ({ device, size, handleSizeChange, isEditMode }) => (
    <FanCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      providerId={device.providerId as CardProviderId}
      initialState={device.state as boolean | undefined}
      initialPercentage={device.percentage as number | undefined}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  hvac: ({ device, size, handleSizeChange, isEditMode, headerSubtitleOverride }) => (
    <HVACCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      providerId={device.providerId as CardProviderId}
      headerSubtitle={headerSubtitleOverride}
      initialTemp={(device.temperature ?? device.temp) as number | undefined}
      initialCurrentTemp={device.currentTemperature as number | undefined}
      temperatureUnit={device.temperatureUnit as 'celsius' | 'fahrenheit' | undefined}
      initialMode={device.mode as string | undefined}
      initialAction={device.action as string | undefined}
      supportedHvacModes={device.supportedHvacModes as string[] | undefined}
      initialState={(device.mode as string | undefined) !== 'off'}
      size={size}
      onSizeChange={handleSizeChange}
      isEditMode={isEditMode}
    />
  ),

  climate: ({ device, size, handleSizeChange, isEditMode, headerSubtitleOverride }) => (
    <HVACCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      providerId={device.providerId as CardProviderId}
      headerSubtitle={headerSubtitleOverride}
      initialTemp={device.temperature as number | undefined}
      initialCurrentTemp={device.currentTemperature as number | undefined}
      temperatureUnit={device.temperatureUnit as 'celsius' | 'fahrenheit' | undefined}
      initialMode={device.mode as string | undefined}
      initialAction={device.action as string | undefined}
      supportedHvacModes={device.supportedHvacModes as string[] | undefined}
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
      deviceClass={device.deviceClass as string | undefined}
      source={device.source as string | undefined}
      sourceList={device.sourceList as string[] | undefined}
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
      temperatureUnit={device.temperatureUnit as 'celsius' | 'fahrenheit' | undefined}
      feelsLikeTemperature={device.feelsLikeTemperature as number | undefined}
      feelsLikeTemperatureUnit={
        device.feelsLikeTemperatureUnit as 'celsius' | 'fahrenheit' | undefined
      }
      condition={device.condition as string}
      humidity={device.humidity as number}
      windSpeed={device.windSpeed as number}
      windSpeedUnit={device.windSpeedUnit as string | undefined}
      windGustSpeed={device.windGustSpeed as number | undefined}
      pressure={device.pressure as number | undefined}
      pressureUnit={device.pressureUnit as string | undefined}
      uvIndex={device.uvIndex as number | undefined}
      cloudCoverage={device.cloudCoverage as number | undefined}
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
          highUnit?: 'celsius' | 'fahrenheit';
          low: number;
          lowUnit?: 'celsius' | 'fahrenheit';
        }>) ?? []
      }
      forecastMode={(device.forecastMode as 'weekly' | 'hourly' | undefined) ?? 'weekly'}
      highTemp={device.highTemp as number}
      highTempUnit={device.highTempUnit as 'celsius' | 'fahrenheit' | undefined}
      lowTemp={device.lowTemp as number}
      lowTempUnit={device.lowTempUnit as 'celsius' | 'fahrenheit' | undefined}
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
      providerId={device.providerId as CardProviderId}
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
      providerId={device.providerId as CardProviderId}
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
      initialPositionMode={device.positionMode as 'position' | 'tilt' | undefined}
      initialDeviceClass={
        device.deviceClass as
          | 'blind'
          | 'shade'
          | 'curtain'
          | 'garage'
          | 'gate'
          | 'awning'
          | 'shutter'
          | 'door'
          | undefined
      }
      supportedFeatures={device.supportedFeatures as number | undefined}
      hasPosition={device.hasPosition as boolean | undefined}
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
      providerId={device.providerId as CardProviderId}
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
      supportedFeatures={device.supportedFeatures as number | undefined}
      isStreamCapable={device.isStreamCapable as boolean | undefined}
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

  sensors: ({ device, size, handleSizeChange, isEditMode, headerSubtitleOverride }) => (
    <InfoCard
      id={device.id as string}
      name={device.name as string}
      room={device.room as string}
      value={device.value as string}
      unit={device.unit as string}
      icon={device.icon as SensorReading['icon']}
      subtitle={headerSubtitleOverride ?? (device.entityType as string | undefined)}
      deviceClass={device.deviceClass as string | undefined}
      status={device.status as 'measurement' | 'active' | 'clear' | 'unavailable' | undefined}
      lastUpdated={device.lastUpdated as string | undefined}
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
      providerId={device.providerId as CardProviderId}
      room={device.room as string}
      status={device.status as VacuumStatus}
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
  return (
    <CardErrorBoundary>
      <EntityAvailabilityFrame device={options.device} isEditMode={options.isEditMode}>
        <Suspense fallback={<EntityCardFallback size={options.size} />}>{card}</Suspense>
      </EntityAvailabilityFrame>
    </CardErrorBoundary>
  );
};
