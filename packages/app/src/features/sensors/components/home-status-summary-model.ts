import { getClimateDashboardGroup } from '@navet/app/features/climate/utils/climate-dashboard-group';
import { getSecurityAlertCount } from '@navet/app/features/security/utils/security-alert-count';
import type { Section } from '@navet/app/navigation/sections';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import {
  convertTemperatureUnitValue,
  formatDisplayTemperature,
  normalizeTemperatureUnit,
  type TemperatureUnit,
} from '@navet/app/utils/temperature';
import type { LucideIcon } from 'lucide-react';
import { Fan, Lightbulb, Shield, Speaker, Zap } from 'lucide-react';

export interface HomeStatusSummaryItem {
  id: string;
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  targetSection: Section;
}

export interface StatusSummaryOptions {
  climateEntityIds?: ReadonlySet<string>;
  gridImportTodayKWh?: number;
  routineCount?: number;
  securityAlertCount?: number;
  temperatureUnit?: TemperatureUnit;
}

const NON_AMBIENT_CLIMATE_SENSOR_PATTERN =
  /\b(boiler|water_heater|water heater|hot water|tank|cylinder|supply|return|flow temp|outside|outdoor|exterior|weather)\b/;
const AMBIENT_FAHRENHEIT_INFERENCE_THRESHOLD = 45;

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPowerValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    const kilowatts = value / 1000;
    return `${kilowatts.toFixed(kilowatts >= 10 ? 0 : 1)} kW`;
  }

  return `${Math.round(value)} W`;
}

function formatEnergyKWh(value: number): string {
  return `${value.toFixed(1)} kWh`;
}

function getEnergySummary(
  devices: DeviceWithType[],
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem | null {
  if (
    typeof options.gridImportTodayKWh === 'number' &&
    Number.isFinite(options.gridImportTodayKWh)
  ) {
    return {
      id: 'energy',
      title: 'Energy',
      value: formatEnergyKWh(options.gridImportTodayKWh),
      icon: Zap,
      iconColor: '#f59e0b',
      targetSection: 'energy',
    };
  }

  const powerValues = devices
    .map((device) => {
      if (device.type === 'switches') {
        return getNumber(device.power);
      }

      if (device.type !== 'sensors') {
        return null;
      }

      const deviceClass = String(device.deviceClass ?? '').toLowerCase();
      const unit = String(device.unit ?? '').toLowerCase();
      if (deviceClass === 'power' || unit === 'w' || unit === 'kw') {
        const value = getNumber(device.value);
        return unit === 'kw' && value !== null ? value * 1000 : value;
      }

      return null;
    })
    .filter((value): value is number => value !== null);
  const energySources = devices.filter((device) => {
    if (device.type === 'switches') {
      return getNumber(device.power) !== null || getNumber(device.energy) !== null;
    }

    if (device.type !== 'sensors') {
      return false;
    }

    const deviceClass = String(device.deviceClass ?? '').toLowerCase();
    return deviceClass === 'power' || deviceClass === 'energy';
  });

  if (powerValues.length === 0 && energySources.length === 0) {
    return null;
  }

  const totalPower = powerValues.reduce((sum, value) => sum + value, 0);

  return {
    id: 'energy',
    title: 'Energy',
    value:
      powerValues.length > 0
        ? formatPowerValue(totalPower)
        : energySources.length === 1
          ? '1 Source'
          : `${energySources.length} Sources`,
    icon: Zap,
    iconColor: '#f59e0b',
    targetSection: 'energy',
  };
}

function getLightSummary(devices: DeviceWithType[]): HomeStatusSummaryItem | null {
  const lights = devices.filter((device) => device.type === 'lights');
  if (lights.length === 0) {
    return null;
  }

  const onCount = lights.filter((device) => device.state === true).length;

  return {
    id: 'lights',
    title: 'Lights',
    value: onCount === 1 ? '1 On' : `${onCount} On`,
    icon: Lightbulb,
    iconColor: '#facc15',
    targetSection: 'lights',
  };
}

function getSecuritySummary(devices: DeviceWithType[]): HomeStatusSummaryItem | null {
  const alertCount = getSecurityAlertCount(devices);
  const hasSecurityCandidates = devices.some(
    (device) =>
      Boolean(device.securityKind) ||
      device.type === 'locks' ||
      device.type === 'covers' ||
      device.type === 'cameras' ||
      device.type === 'sensors'
  );
  if (!hasSecurityCandidates) {
    return null;
  }

  return {
    id: 'security',
    title: 'Security',
    value: alertCount === 0 ? 'No Alerts' : alertCount === 1 ? '1 Alert' : `${alertCount} Alerts`,
    icon: Shield,
    iconColor: alertCount === 0 ? '#22c55e' : '#f87171',
    targetSection: 'security',
  };
}

function getMediaSummary(devices: DeviceWithType[]): HomeStatusSummaryItem | null {
  const media = devices.filter((device) => device.type === 'media');
  if (media.length === 0) {
    return null;
  }

  const playingCount = media.filter((device) => device.state === 'playing').length;

  return {
    id: 'media',
    title: 'Speakers & TVs',
    value:
      playingCount === 0
        ? 'None Playing'
        : playingCount === 1
          ? '1 Playing'
          : `${playingCount} Playing`,
    icon: Speaker,
    iconColor: playingCount > 0 ? '#60a5fa' : '#cbd5e1',
    targetSection: 'media',
  };
}

function isAmbientTemperatureSensor(
  device: DeviceWithType
): device is DeviceWithType & { type: 'sensors' } {
  if (device.type !== 'sensors') {
    return false;
  }

  if (String(device.deviceClass ?? '').toLowerCase() !== 'temperature') {
    return false;
  }

  const searchText = `${device.id} ${device.name} ${device.room}`.toLowerCase();

  return !NON_AMBIENT_CLIMATE_SENSOR_PATTERN.test(searchText);
}

function isSummaryEligibleClimateDevice(
  device: DeviceWithType,
  allowedClimateEntityIds: ReadonlySet<string> | undefined
): device is (DeviceWithType & { type: 'climate' }) | (DeviceWithType & { type: 'hvac' }) {
  if (allowedClimateEntityIds && !allowedClimateEntityIds.has(device.id)) {
    return false;
  }

  if (!isClimateLikeDevice(device)) {
    return false;
  }

  return (
    getClimateDashboardGroup(device) !== null &&
    (device.type === 'hvac' || device.serviceDomain !== 'water_heater')
  );
}

function isSummaryEligibleClimateSensor(
  device: DeviceWithType,
  allowedClimateEntityIds: ReadonlySet<string> | undefined
): device is DeviceWithType & { type: 'sensors' } {
  if (allowedClimateEntityIds && !allowedClimateEntityIds.has(device.id)) {
    return false;
  }

  return getClimateDashboardGroup(device) === 'temperature' && isAmbientTemperatureSensor(device);
}

function isClimateLikeDevice(
  device: DeviceWithType
): device is (DeviceWithType & { type: 'climate' }) | (DeviceWithType & { type: 'hvac' }) {
  return device.type === 'climate' || device.type === 'hvac';
}

function isHvacDevice(device: DeviceWithType): device is DeviceWithType & { type: 'hvac' } {
  return device.type === 'hvac';
}

function formatClimateSummaryValue(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return `${formatDisplayTemperature(Math.round(min))}°`;
  }

  return `${formatDisplayTemperature(min).replace('.', ',')}–${formatDisplayTemperature(max).replace('.', ',')}°`;
}

function resolveAmbientTemperatureSourceUnit(
  value: number,
  sourceUnit: TemperatureUnit | undefined
): TemperatureUnit {
  if (sourceUnit) {
    return sourceUnit;
  }

  return value > AMBIENT_FAHRENHEIT_INFERENCE_THRESHOLD ? 'fahrenheit' : 'celsius';
}

function getClimateSummary(
  devices: DeviceWithType[],
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem | null {
  const allowedClimateEntityIds = options.climateEntityIds;
  const climateDevices = devices.filter((device) =>
    isSummaryEligibleClimateDevice(device, allowedClimateEntityIds)
  );
  const temperatureSensors = devices.filter((device) =>
    isSummaryEligibleClimateSensor(device, allowedClimateEntityIds)
  );
  const values = [
    ...climateDevices.map((device) => {
      let value: number | null;
      if (device.type === 'climate') {
        value = getNumber(device.currentTemperature) ?? getNumber(device.temperature);
      } else if (isHvacDevice(device)) {
        value = getNumber(device.temp);
      } else {
        value = null;
      }
      if (value === null) {
        return null;
      }

      const sourceUnit = resolveAmbientTemperatureSourceUnit(
        value,
        device.type === 'climate' ? normalizeTemperatureUnit(device.temperatureUnit) : undefined
      );
      return convertTemperatureUnitValue(value, sourceUnit, options.temperatureUnit ?? 'celsius');
    }),
    ...temperatureSensors.map((device) => {
      const value = getNumber(device.value);
      if (value === null) {
        return null;
      }

      return convertTemperatureUnitValue(
        value,
        resolveAmbientTemperatureSourceUnit(value, normalizeTemperatureUnit(device.unit)),
        options.temperatureUnit ?? 'celsius'
      );
    }),
  ].filter((value): value is number => value !== null);

  if (climateDevices.length === 0 && values.length === 0) {
    return null;
  }

  const value =
    values.length === 0 ? `${climateDevices.length} Active` : formatClimateSummaryValue(values);

  return {
    id: 'climate',
    title: 'Climate',
    value,
    icon: Fan,
    iconColor: '#22d3ee',
    targetSection: 'climate',
  };
}

function buildStatusSummaryItems(
  devices: DeviceWithType[],
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem[] {
  const securitySummary =
    options.securityAlertCount !== undefined
      ? {
          id: 'security',
          title: 'Security',
          value:
            options.securityAlertCount === 0
              ? 'No Alerts'
              : options.securityAlertCount === 1
                ? '1 Alert'
                : `${options.securityAlertCount} Alerts`,
          icon: Shield,
          iconColor: options.securityAlertCount === 0 ? '#22c55e' : '#f87171',
          targetSection: 'security' as const,
        }
      : getSecuritySummary(devices);

  return [
    getEnergySummary(devices, options),
    getClimateSummary(devices, options),
    securitySummary,
    getLightSummary(devices),
    getMediaSummary(devices),
  ].filter((item): item is HomeStatusSummaryItem => item !== null);
}

export function buildHomeStatusSummaryItems(
  deviceMap: Map<string, DeviceWithType>,
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem[] {
  return buildStatusSummaryItems(Array.from(deviceMap.values()), options);
}

export function buildRoomStatusSummaryItems(
  deviceMap: Map<string, DeviceWithType>,
  room: string,
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem[] {
  const roomDevices = Array.from(deviceMap.values()).filter(
    (device) => getDeviceRoomLabel(device) === room
  );
  return buildStatusSummaryItems(roomDevices, options);
}
