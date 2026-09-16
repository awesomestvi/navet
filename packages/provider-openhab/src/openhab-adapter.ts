import {
  INTEGRATION_PROVIDERS,
  type NavetProviderContract,
  type NavetProviderSessionInput,
  type NavetProviderSessionMap,
} from '@navet/core';
import { UnsupportedProviderCommandError } from '@navet/core/errors';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type { NavetCommand, NavetEntity } from '@navet/core/types';
import { buildOpenHABProviderState } from './openhab-provider-state';
import { createOpenHABSnapshotClient, openhabService } from './openhab-service';

interface OpenHABProviderSessionInput extends NavetProviderSessionInput {
  providerId: 'openhab';
}

function getOpenHABProviderSession(
  sessions: NavetProviderSessionMap
): OpenHABProviderSessionInput | null {
  const session = sessions.openhab;
  return session?.providerId === 'openhab' ? (session as OpenHABProviderSessionInput) : null;
}

function buildProviderSession(session: OpenHABProviderSessionInput, connected: boolean) {
  return {
    providerId: session.providerId,
    connected,
    runtime: session.runtime,
    authMode: session.authMode,
  };
}

function resolveOpenHABCommand(command: NavetCommand): string {
  switch (command.type) {
    case 'turn_on':
      return 'ON';
    case 'turn_off':
      return 'OFF';
    case 'set_brightness':
      return String(Math.max(0, Math.min(100, Math.round(command.brightness))));
    case 'set_fan_speed':
      return String(Math.max(0, Math.min(100, Math.round(command.percentage))));
    case 'set_temperature':
      return String(command.temperature);
    case 'lock':
      return 'LOCK';
    case 'unlock':
      return 'UNLOCK';
    case 'open':
      return 'UP';
    case 'close':
      return 'DOWN';
    default:
      throw new UnsupportedProviderCommandError((command as { type: string }).type);
  }
}

function getOpenHABItemType(entity: NavetEntity): string | undefined {
  return typeof entity.attributes.itemType === 'string'
    ? entity.attributes.itemType
    : typeof entity.attributes.item_type === 'string'
      ? entity.attributes.item_type
      : undefined;
}

export async function executeOpenHABCommand(entity: NavetEntity, command: NavetCommand) {
  const itemType = getOpenHABItemType(entity);
  const item = openhabService.getSnapshot().items[entity.externalId];
  if (command.type !== 'set_volume' && item?.stateDescription?.readOnly)
    throw new Error('This openHAB item is read-only');
  if ((command.type === 'lock' || command.type === 'unlock') && entity.type !== 'lock')
    throw new UnsupportedProviderCommandError(command.type);
  if (
    command.type === 'set_temperature' &&
    (!Number.isFinite(command.temperature) || entity.type !== 'climate')
  )
    throw new UnsupportedProviderCommandError(command.type);
  if (command.type === 'set_brightness' && !Number.isFinite(command.brightness))
    throw new Error('Invalid brightness');
  if (
    command.type === 'set_fan_speed' &&
    (!Number.isFinite(command.percentage) || entity.type !== 'fan')
  )
    throw new Error('Invalid fan speed');
  if (command.type === 'set_volume') {
    const volumeId = entity.attributes.volumeItemId;
    if (
      entity.type !== 'media_player' ||
      typeof volumeId !== 'string' ||
      !Number.isFinite(command.volume) ||
      command.volume < 0 ||
      command.volume > 100
    )
      throw new UnsupportedProviderCommandError(command.type);
    const volume = openhabService.getSnapshot().items[volumeId];
    if (!volume || volume.stateDescription?.readOnly)
      throw new Error('Volume control is unavailable');
    await openhabService.sendItemCommand(volumeId, String(command.volume));
    return;
  }
  if (entity.type === 'media_player' && ['play_pause', 'start', 'pause'].includes(command.type)) {
    const play =
      command.type === 'start' ||
      (command.type === 'play_pause' && entity.primaryState !== 'playing');
    await openhabService.sendItemCommand(entity.externalId, play ? 'PLAYING' : 'PAUSED');
    return;
  }
  if ((command.type === 'lock' || command.type === 'unlock') && itemType === 'Switch') {
    await openhabService.sendItemCommand(entity.externalId, command.type === 'lock' ? 'ON' : 'OFF');
    return;
  }
  if (command.type === 'stop' && itemType === 'Rollershutter') {
    await openhabService.sendItemCommand(entity.externalId, 'STOP');
    return;
  }

  switch (command.type) {
    case 'turn_on':
    case 'turn_off':
      if (!['Switch', 'Dimmer', 'Color'].includes(itemType ?? '')) {
        throw new UnsupportedProviderCommandError(command.type);
      }
      break;
    case 'set_brightness':
      if (!['Dimmer', 'Color'].includes(itemType ?? '')) {
        throw new UnsupportedProviderCommandError(command.type);
      }
      break;
    case 'set_fan_speed':
      if (itemType !== 'Dimmer') {
        throw new UnsupportedProviderCommandError(command.type);
      }
      break;
    case 'set_temperature':
      if (!itemType?.startsWith('Number')) {
        throw new UnsupportedProviderCommandError(command.type);
      }
      break;
    case 'lock':
    case 'unlock':
      if (!['Switch', 'String'].includes(itemType ?? '')) {
        throw new UnsupportedProviderCommandError(command.type);
      }
      break;
    case 'open':
    case 'close':
      if (itemType !== 'Rollershutter') {
        throw new UnsupportedProviderCommandError(command.type);
      }
      break;
  }

  await openhabService.sendItemCommand(entity.externalId, resolveOpenHABCommand(command));
}

export function createOpenHABProviderContract(): NavetProviderContract {
  return {
    providerId: 'openhab',
    bootstrapSession: (sessions) => {
      const session = getOpenHABProviderSession(sessions);
      return session ? buildProviderSession(session, openhabService.getSnapshot().connected) : null;
    },
    initializeSession: async (session) => {
      if (session.providerId !== 'openhab') {
        return;
      }

      openhabService.setClient(createOpenHABSnapshotClient(session));
      await openhabService.loadSnapshot();
    },
    teardownSession: () => {
      openhabService.setClient(null);
      openhabService.resetSnapshot();
    },
    getState: () => buildOpenHABProviderState(openhabService.getSnapshot()),
    subscribeState: (listener) => openhabService.subscribe(() => listener()),
    normalizeResourceUrl: (resourceUrl) => resourceUrl,
  };
}

export function createOpenHABContractAdapter(
  contract: NavetProviderContract = createOpenHABProviderContract(),
  options: {
    getSession?: () => NavetProviderSessionInput | null | undefined;
  } = {}
) {
  return createSnapshotBackedProviderAdapter({
    providerId: 'openhab',
    providerLabel: INTEGRATION_PROVIDERS.openhab.label,
    contract,
    executeCommand: executeOpenHABCommand,
    getSession: options.getSession,
  });
}
