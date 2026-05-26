import type { LucideIcon } from 'lucide-react';
import { Clipboard, Fan, Lightbulb, Shield, Speaker, Zap } from 'lucide-react';
import type { Section } from '@/app/navigation/sections';
import type { DeviceWithType } from '@/app/types/device.types';
import { getDeviceRoomLabel } from '@/app/utils/device-location';
import {
  convertTemperatureUnitValue,
  formatDisplayTemperature,
  normalizeTemperatureUnit,
  type TemperatureUnit,
} from '@/app/utils/temperature';

export interface HomeStatusSummaryItem {
  id: string;
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  targetSection: Section;
}

export interface StatusSummaryOptions {
  gridImportTodayKWh?: number;
  routineCount?: number;
  temperatureUnit?: TemperatureUnit;
}

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
  const securityDevices = devices.filter(
    (device) =>
      device.type === 'locks' ||
      device.type === 'covers' ||
      device.type === 'cameras' ||
      (device.type === 'sensors' &&
        [
          'door',
          'garage_door',
          'gas',
          'moisture',
          'motion',
          'occupancy',
          'opening',
          'presence',
          'problem',
          'safety',
          'smoke',
          'tamper',
          'window',
        ].includes(String(device.deviceClass ?? '').toLowerCase()))
  );
  if (securityDevices.length === 0) {
    return null;
  }

  const alertCount = securityDevices.filter((device) => {
    if (device.type === 'locks') {
      return device.state === false;
    }
    if (device.type === 'covers') {
      return getNumber(device.position) !== null && getNumber(device.position) !== 0;
    }
    if (device.type === 'sensors') {
      return device.status === 'active';
    }
    if (device.type === 'cameras') {
      return device.motionDetected === true;
    }
    return false;
  }).length;

  return {
    id: 'security',
    title: 'Security',
    value: alertCount === 0 ? 'No Alerts' : alertCount === 1 ? '1 Alert' : `${alertCount} Alerts`,
    icon: Shield,
    iconColor: alertCount === 0 ? '#2dd4bf' : '#f87171',
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

  return !/\b(boiler|water_heater|water heater|hot water|tank|cylinder|supply|return|flow temp|outside|outdoor|exterior|weather)\b/.test(
    searchText
  );
}

function formatClimateSummaryValue(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return `${formatDisplayTemperature(Math.round(min))}°`;
  }

  return `${formatDisplayTemperature(min).replace('.', ',')}–${formatDisplayTemperature(max).replace('.', ',')}°`;
}

function getClimateSummary(
  devices: DeviceWithType[],
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem | null {
  const climateDevices = devices.filter(
    (device) =>
      (device.type === 'climate' && device.serviceDomain !== 'water_heater') ||
      device.type === 'hvac'
  );
  const temperatureSensors = devices.filter(isAmbientTemperatureSensor);
  const values = [
    ...climateDevices.map((device) => {
      const value =
        device.type === 'climate'
          ? (getNumber(device.currentTemperature) ?? getNumber(device.temperature))
          : getNumber(device.temp);
      if (value === null) {
        return null;
      }

      const sourceUnit =
        device.type === 'climate' ? normalizeTemperatureUnit(device.temperatureUnit) : undefined;
      return convertTemperatureUnitValue(value, sourceUnit, options.temperatureUnit ?? 'celsius');
    }),
    ...temperatureSensors.map((device) => {
      const value = getNumber(device.value);
      if (value === null) {
        return null;
      }

      return convertTemperatureUnitValue(
        value,
        normalizeTemperatureUnit(device.unit),
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

function getRoutineSummary(
  devices: DeviceWithType[],
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem | null {
  const activeScripts = devices.filter(
    (device) =>
      device.type === 'helpers' && device.serviceDomain === 'script' && device.state === true
  );
  const count = options.routineCount ?? activeScripts.length;

  if (count === 0) {
    return null;
  }

  return {
    id: 'routines',
    title: 'Routines',
    value: count === 1 ? '1 Routine' : `${count} Routines`,
    icon: Clipboard,
    iconColor: '#a78bfa',
    targetSection: 'tasks',
  };
}

function buildStatusSummaryItems(
  devices: DeviceWithType[],
  options: StatusSummaryOptions = {}
): HomeStatusSummaryItem[] {
  return [
    getEnergySummary(devices, options),
    getClimateSummary(devices, options),
    getSecuritySummary(devices),
    getLightSummary(devices),
    getMediaSummary(devices),
    getRoutineSummary(devices, options),
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
