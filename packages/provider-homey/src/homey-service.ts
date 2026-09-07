import { UnsupportedProviderCommandError } from '@navet/core/errors';
import type { IntegrationServiceTarget } from '@navet/core/integration-service-target';
import type { NavetCommand, NavetEntity } from '@navet/core/types';
import type { HomeySnapshot } from './homey-types';

export interface HomeyCapabilityCommand {
  deviceId: string;
  capabilityId: string;
  value: boolean | number | string | null;
}

export interface HomeyActionClient {
  setCapabilityValue(command: HomeyCapabilityCommand): Promise<void>;
}

export interface HomeySnapshotClient extends HomeyActionClient {
  loadSnapshot?(): Promise<HomeySnapshot>;
  subscribeSnapshot?(listener: HomeySnapshotListener): () => void;
}

type HomeySnapshotListener = (snapshot: HomeySnapshot) => void;

const EMPTY_HOMEY_SNAPSHOT: HomeySnapshot = {
  connected: false,
  devices: {},
  zones: {},
};
const HOMEY_LIGHT_TEMPERATURE_MIN_KELVIN = 2700;
const HOMEY_LIGHT_TEMPERATURE_MAX_KELVIN = 6500;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePercentageValue(rawValue: unknown): number | null {
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return null;
  }

  return clamp(rawValue / 100, 0, 1);
}

function normalizeBrightnessValue(rawValue: unknown): number | null {
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return null;
  }

  return clamp(rawValue / 255, 0, 1);
}

function normalizeKelvinValue(rawValue: unknown): number | null {
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return null;
  }

  return clamp(
    (rawValue - HOMEY_LIGHT_TEMPERATURE_MIN_KELVIN) /
      (HOMEY_LIGHT_TEMPERATURE_MAX_KELVIN - HOMEY_LIGHT_TEMPERATURE_MIN_KELVIN),
    0,
    1
  );
}

function getTargetDeviceIds(target?: IntegrationServiceTarget): string[] {
  const rawIds = target?.deviceId ?? target?.entityId;

  if (typeof rawIds === 'string') {
    return [rawIds];
  }

  if (Array.isArray(rawIds)) {
    return rawIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  return [];
}

function applyCapabilityCommands(
  snapshot: HomeySnapshot,
  commands: HomeyCapabilityCommand[]
): HomeySnapshot | null {
  if (commands.length === 0) {
    return null;
  }

  let devicesChanged = false;
  const nextDevices: HomeySnapshot['devices'] = { ...snapshot.devices };

  for (const command of commands) {
    const existingDevice = nextDevices[command.deviceId];
    if (!existingDevice) {
      continue;
    }

    nextDevices[command.deviceId] = {
      ...existingDevice,
      capabilitiesObj: {
        ...(existingDevice.capabilitiesObj ?? {}),
        [command.capabilityId]: {
          ...(existingDevice.capabilitiesObj?.[command.capabilityId] ?? {}),
          value: command.value,
        },
      },
    };
    devicesChanged = true;
  }

  if (!devicesChanged) {
    return null;
  }

  return {
    ...snapshot,
    devices: nextDevices,
  };
}

function buildCapabilityCommands(
  deviceIds: string[],
  action: { on: boolean; dim?: number | null; temperature?: number | null }
): HomeyCapabilityCommand[] {
  const values: [string, boolean | number][] = [['onoff', action.on]];
  if (action.dim != null) values.push(['dim', action.dim]);
  if (action.temperature != null) values.push(['light_temperature', action.temperature]);
  return values.flatMap(([capabilityId, value]) =>
    deviceIds.map((deviceId) => ({ deviceId, capabilityId, value }))
  );
}

export function translateHomeyCommand(
  entity: Pick<NavetEntity, 'externalId' | 'type'>,
  command: NavetCommand
): HomeyCapabilityCommand[] {
  const deviceIds = [entity.externalId];
  switch (command.type) {
    case 'turn_on':
    case 'turn_off':
      if (['light', 'switch', 'helper', 'fan'].includes(entity.type)) {
        return buildCapabilityCommands(deviceIds, { on: command.type === 'turn_on' });
      }
      break;
    case 'set_brightness': {
      const dim = normalizePercentageValue(command.brightness);
      if (dim === null)
        throw new Error('Homey light brightness actions require a numeric brightness');
      return buildCapabilityCommands(deviceIds, { on: true, dim });
    }
    case 'set_fan_speed': {
      const dim = normalizePercentageValue(command.percentage);
      if (dim === null)
        throw new Error('Homey fan percentage actions require a numeric percentage');
      return buildCapabilityCommands(deviceIds, { on: dim > 0, dim });
    }
    case 'set_color_temperature': {
      const temperature = normalizeKelvinValue(command.kelvin);
      if (temperature === null)
        throw new Error('Homey light temperature actions require a numeric Kelvin value');
      return buildCapabilityCommands(deviceIds, { on: true, temperature });
    }
  }
  throw new UnsupportedProviderCommandError(command.type);
}

export function translateHomeyServiceAction(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {},
  target?: IntegrationServiceTarget
): HomeyCapabilityCommand[] {
  const deviceIds = getTargetDeviceIds(target);

  if (deviceIds.length === 0) {
    throw new Error('Homey actions require a target device id');
  }

  if (domain === 'fan' && service === 'set_percentage') {
    const dim = normalizePercentageValue(serviceData.percentage);
    if (dim === null) {
      throw new Error('Homey fan percentage actions require a numeric percentage');
    }

    return buildCapabilityCommands(deviceIds, { on: dim > 0, dim });
  }

  if (service === 'turn_on' && ['light', 'switch', 'fan'].includes(domain)) {
    const brightness =
      domain === 'light'
        ? 'brightness_pct' in serviceData
          ? normalizePercentageValue(serviceData.brightness_pct)
          : 'brightness' in serviceData
            ? normalizeBrightnessValue(serviceData.brightness)
            : null
        : null;
    if (
      domain === 'light' &&
      ('brightness_pct' in serviceData || 'brightness' in serviceData) &&
      brightness === null
    ) {
      throw new Error('Homey light brightness actions require a numeric brightness');
    }

    const temperature =
      domain === 'light' && 'kelvin' in serviceData
        ? normalizeKelvinValue(serviceData.kelvin)
        : null;
    if (domain === 'light' && 'kelvin' in serviceData && temperature === null) {
      throw new Error('Homey light temperature actions require a numeric Kelvin value');
    }

    return buildCapabilityCommands(deviceIds, { on: true, dim: brightness, temperature });
  }

  if (service === 'turn_off' && ['light', 'switch', 'fan'].includes(domain)) {
    return buildCapabilityCommands(deviceIds, { on: false });
  }

  throw new Error(`Homey does not support ${domain}.${service} yet`);
}

class HomeyService {
  private client: HomeySnapshotClient | null = null;
  private snapshot: HomeySnapshot = EMPTY_HOMEY_SNAPSHOT;
  private listeners = new Set<HomeySnapshotListener>();
  private clientSnapshotUnsubscribe: (() => void) | null = null;

  setClient(client: HomeySnapshotClient | null) {
    this.clientSnapshotUnsubscribe?.();
    this.clientSnapshotUnsubscribe = null;
    this.client = client;

    if (client?.subscribeSnapshot) {
      this.clientSnapshotUnsubscribe = client.subscribeSnapshot((snapshot) => {
        this.replaceSnapshot(snapshot);
      });
    }
  }

  isConfigured() {
    return this.client !== null;
  }

  async loadSnapshot(): Promise<HomeySnapshot> {
    if (!this.client?.loadSnapshot) {
      throw new Error('Homey snapshot loading is not configured yet');
    }

    const snapshot = await this.client.loadSnapshot();
    this.replaceSnapshot(snapshot);
    return snapshot;
  }

  getSnapshot(): HomeySnapshot {
    return this.snapshot;
  }

  replaceSnapshot(snapshot: Partial<HomeySnapshot>) {
    this.snapshot = {
      connected: snapshot.connected ?? this.snapshot.connected,
      devices: snapshot.devices ?? this.snapshot.devices,
      zones: snapshot.zones ?? this.snapshot.zones,
    };
    this.emitSnapshot();
  }

  resetSnapshot() {
    this.snapshot = EMPTY_HOMEY_SNAPSHOT;
    this.emitSnapshot();
  }

  subscribe(listener: HomeySnapshotListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitSnapshot() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown> = {},
    target?: IntegrationServiceTarget
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Homey integration is not configured yet');
    }

    await this.executeCapabilityCommands(
      translateHomeyServiceAction(domain, service, serviceData, target)
    );
  }

  async executeCommand(entity: NavetEntity, command: NavetCommand): Promise<void> {
    await this.executeCapabilityCommands(translateHomeyCommand(entity, command));
  }

  private async executeCapabilityCommands(commands: HomeyCapabilityCommand[]): Promise<void> {
    if (!this.client) throw new Error('Homey integration is not configured yet');
    for (const command of commands) {
      await this.client.setCapabilityValue(command);
    }

    const nextSnapshot = applyCapabilityCommands(this.snapshot, commands);
    if (nextSnapshot) {
      this.snapshot = nextSnapshot;
      this.emitSnapshot();
    }
  }
}

export const homeyService = new HomeyService();
