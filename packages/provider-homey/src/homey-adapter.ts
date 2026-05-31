import {
  INTEGRATION_PROVIDERS,
  type NavetProviderContract,
  type NavetProviderSessionInput,
  type NavetProviderSessionMap,
} from '@navet/core';
import { UnsupportedProviderCommandError } from '@navet/core/errors';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type { NavetCommand, NavetEntity, NavetProviderState } from '@navet/core/types';
import {
  callHomeyService,
  ensureHomeyConfigured,
  getHomeySnapshot,
  loadHomeySnapshot,
  replaceHomeySnapshot,
  resetHomeySnapshot,
  subscribeHomeySnapshot,
} from './homey-bridge';
import { buildHomeyProviderRooms, mapHomeySnapshotToNavetEntities } from './homey-mappers';
import type { HomeySnapshot } from './homey-types';

interface HomeyProviderSessionInput extends NavetProviderSessionInput {
  providerId: 'homey';
  homeySnapshot?: HomeySnapshot;
}

function getHomeyProviderSession(
  sessions: NavetProviderSessionMap
): HomeyProviderSessionInput | null {
  const session = sessions.homey;
  return session?.providerId === 'homey' ? (session as HomeyProviderSessionInput) : null;
}

function buildProviderSession(session: HomeyProviderSessionInput, connected: boolean) {
  return {
    providerId: session.providerId,
    connected,
    runtime: session.runtime,
    authMode: session.authMode,
  };
}

function getEntityCommandDomain(entity: NavetEntity): string {
  if (entity.externalId.includes('.')) {
    return entity.externalId.split('.', 1)[0] || 'homey';
  }

  switch (entity.type) {
    case 'light':
      return 'light';
    case 'fan':
      return 'fan';
    case 'switch':
    case 'helper':
      return 'switch';
    case 'climate':
    case 'hvac':
      return 'climate';
    case 'lock':
      return 'lock';
    case 'cover':
      return 'cover';
    case 'vacuum':
      return 'vacuum';
    case 'scene':
      return 'scene';
    default:
      return 'homey';
  }
}

async function executeHomeyCommand(entity: NavetEntity, command: NavetCommand) {
  const target = { entityId: entity.externalId };

  switch (command.type) {
    case 'turn_on':
      await callHomeyService(getEntityCommandDomain(entity), 'turn_on', {}, target);
      return;
    case 'turn_off':
      await callHomeyService(getEntityCommandDomain(entity), 'turn_off', {}, target);
      return;
    case 'set_fan_speed':
      await callHomeyService('fan', 'set_percentage', { percentage: command.percentage }, target);
      return;
    case 'play_pause':
      await callHomeyService('media_player', 'media_play_pause', {}, target);
      return;
    case 'previous_track':
      await callHomeyService('media_player', 'media_previous_track', {}, target);
      return;
    case 'next_track':
      await callHomeyService('media_player', 'media_next_track', {}, target);
      return;
    case 'set_volume':
      await callHomeyService(
        'media_player',
        'volume_set',
        { volume_level: command.volume / 100 },
        target
      );
      return;
    case 'mute':
      await callHomeyService('media_player', 'volume_mute', { is_volume_muted: true }, target);
      return;
    case 'unmute':
      await callHomeyService('media_player', 'volume_mute', { is_volume_muted: false }, target);
      return;
    case 'set_shuffle':
      await callHomeyService('media_player', 'shuffle_set', { shuffle: command.shuffle }, target);
      return;
    case 'set_repeat_mode':
      await callHomeyService('media_player', 'repeat_set', { repeat: command.repeatMode }, target);
      return;
    case 'join_group':
      await callHomeyService('media_player', 'join', { group_members: command.members }, target);
      return;
    case 'leave_group':
      await callHomeyService('media_player', 'unjoin', {}, target);
      return;
    case 'set_climate_mode':
      await callHomeyService('climate', 'set_hvac_mode', { hvac_mode: command.mode }, target);
      return;
    case 'set_brightness':
      await callHomeyService('light', 'turn_on', { brightness_pct: command.brightness }, target);
      return;
    case 'set_color_temperature':
      await callHomeyService('light', 'turn_on', { kelvin: command.kelvin }, target);
      return;
    case 'set_temperature':
      await callHomeyService(
        'climate',
        'set_temperature',
        { temperature: command.temperature },
        target
      );
      return;
    case 'lock':
      await callHomeyService('lock', 'lock', {}, target);
      return;
    case 'unlock':
      await callHomeyService('lock', 'unlock', {}, target);
      return;
    case 'open':
      await callHomeyService('cover', 'open_cover', {}, target);
      return;
    case 'close':
      await callHomeyService('cover', 'close_cover', {}, target);
      return;
    case 'start':
      await callHomeyService('vacuum', 'start', {}, target);
      return;
    case 'stop':
      await callHomeyService('vacuum', 'pause', {}, target);
      return;
    case 'return_home':
      await callHomeyService('vacuum', 'return_to_base', {}, target);
      return;
    case 'service':
      await callHomeyService(
        command.domain,
        command.service,
        command.serviceData ?? {},
        (command.target as
          | {
              entityId?: string | string[];
              areaId?: string | string[];
              deviceId?: string | string[];
            }
          | undefined) ?? target
      );
      return;
    default:
      throw new UnsupportedProviderCommandError((command as { type: string }).type);
  }
}

export function createHomeyProviderContract(): NavetProviderContract {
  return {
    providerId: 'homey',
    bootstrapSession: (sessions) => {
      const session = getHomeyProviderSession(sessions);
      return session ? buildProviderSession(session, getHomeySnapshot().connected) : null;
    },
    initializeSession: async (session) => {
      if (session.providerId !== 'homey') {
        return;
      }

      ensureHomeyConfigured();

      const homeySession = session as HomeyProviderSessionInput;
      if (homeySession.homeySnapshot) {
        replaceHomeySnapshot({
          connected: homeySession.homeySnapshot.connected,
          devices: homeySession.homeySnapshot.devices,
          zones: homeySession.homeySnapshot.zones,
        });
        return;
      }

      await loadHomeySnapshot();
    },
    teardownSession: () => {
      resetHomeySnapshot();
    },
    getState: () => buildHomeyProviderState(getHomeySnapshot()),
    subscribeState: (listener) => subscribeHomeySnapshot(() => listener()),
    resolveResource: (request) => ({
      id: request.deviceId,
      kind: 'unavailable',
      cacheKey: request.deviceId,
      authStrategy: 'none',
    }),
    normalizeResourceUrl: (resourceUrl) => resourceUrl,
  };
}

export function createHomeyContractAdapter(
  contract: NavetProviderContract = createHomeyProviderContract(),
  options: {
    getSession?: () => NavetProviderSessionInput | null | undefined;
  } = {}
) {
  return createSnapshotBackedProviderAdapter({
    providerId: 'homey',
    providerLabel: INTEGRATION_PROVIDERS.homey.label,
    contract,
    executeCommand: executeHomeyCommand,
    getSession: options.getSession,
  });
}

function buildHomeyProviderState(
  snapshot: Parameters<typeof mapHomeySnapshotToNavetEntities>[0]
): NavetProviderState {
  return {
    providerId: 'homey',
    connected: snapshot.connected,
    entities: mapHomeySnapshotToNavetEntities(snapshot),
    rooms: buildHomeyProviderRooms(snapshot),
  };
}
