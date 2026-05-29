import type { NavetProviderContract } from '@navet/app/internal/compat';
import { UnsupportedProviderCommandError } from '@navet/core/errors';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type { NavetCommand, NavetEntity, NavetProviderState } from '@navet/core/types';
import type { AuthSession, AuthSessionMap } from '@/auth/types';
import { buildOpenHABProviderRooms, mapOpenHABSnapshotToNavetEntities } from './openhab-mappers';
import { createOpenHABSnapshotClient, openhabService } from './openhab-service';

function createProviderSessionMap(
  sessions: AuthSessionMap
): Partial<Record<AuthSession['providerId'], AuthSession>> {
  return Object.fromEntries(
    Object.entries(sessions).filter((entry): entry is [AuthSession['providerId'], AuthSession] =>
      Boolean(entry[1])
    )
  ) as Partial<Record<AuthSession['providerId'], AuthSession>>;
}

function buildProviderSession(session: AuthSession, connected: boolean) {
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

async function executeOpenHABCommand(entity: NavetEntity, command: NavetCommand) {
  const itemType = getOpenHABItemType(entity);

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
      const session = createProviderSessionMap(sessions).openhab;
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
  contract: NavetProviderContract = createOpenHABProviderContract()
) {
  return createSnapshotBackedProviderAdapter({
    providerId: 'openhab',
    contract,
    executeCommand: executeOpenHABCommand,
  });
}

function buildOpenHABProviderState(
  snapshot: Parameters<typeof mapOpenHABSnapshotToNavetEntities>[0]
): NavetProviderState {
  return {
    providerId: 'openhab',
    connected: snapshot.connected,
    entities: mapOpenHABSnapshotToNavetEntities(snapshot),
    rooms: buildOpenHABProviderRooms(snapshot),
  };
}
