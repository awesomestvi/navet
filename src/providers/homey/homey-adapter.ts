import type { NavetProviderContract } from '@navet/app/internal/compat';
import { UnsupportedProviderCommandError } from '@navet/core/errors';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type { NavetCommand, NavetEntity, NavetProviderState } from '@navet/core/types';
import { homeyService } from '@/app/services/homey.service';
import { ensureHomeyApiClientConfigured } from '@/app/services/homey-api-client.service';
import type { AuthSession, AuthSessionMap } from '@/auth/types';
import { buildHomeyProviderRooms, mapHomeySnapshotToNavetEntities } from './homey-mappers';

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
  const target = { entity_id: entity.externalId };

  switch (command.type) {
    case 'turn_on':
      await homeyService.callService(getEntityCommandDomain(entity), 'turn_on', {}, target);
      return;
    case 'turn_off':
      await homeyService.callService(getEntityCommandDomain(entity), 'turn_off', {}, target);
      return;
    case 'set_fan_speed':
      await homeyService.callService(
        'fan',
        'set_percentage',
        { percentage: command.percentage },
        target
      );
      return;
    case 'play_pause':
      await homeyService.callService('media_player', 'media_play_pause', {}, target);
      return;
    case 'previous_track':
      await homeyService.callService('media_player', 'media_previous_track', {}, target);
      return;
    case 'next_track':
      await homeyService.callService('media_player', 'media_next_track', {}, target);
      return;
    case 'set_volume':
      await homeyService.callService(
        'media_player',
        'volume_set',
        { volume_level: command.volume / 100 },
        target
      );
      return;
    case 'mute':
      await homeyService.callService(
        'media_player',
        'volume_mute',
        { is_volume_muted: true },
        target
      );
      return;
    case 'unmute':
      await homeyService.callService(
        'media_player',
        'volume_mute',
        { is_volume_muted: false },
        target
      );
      return;
    case 'set_shuffle':
      await homeyService.callService(
        'media_player',
        'shuffle_set',
        { shuffle: command.shuffle },
        target
      );
      return;
    case 'set_repeat_mode':
      await homeyService.callService(
        'media_player',
        'repeat_set',
        { repeat: command.repeatMode },
        target
      );
      return;
    case 'join_group':
      await homeyService.callService(
        'media_player',
        'join',
        { group_members: command.members },
        target
      );
      return;
    case 'leave_group':
      await homeyService.callService('media_player', 'unjoin', {}, target);
      return;
    case 'set_climate_mode':
      await homeyService.callService(
        'climate',
        'set_hvac_mode',
        { hvac_mode: command.mode },
        target
      );
      return;
    case 'set_brightness':
      await homeyService.callService(
        'light',
        'turn_on',
        { brightness_pct: command.brightness },
        target
      );
      return;
    case 'set_color_temperature':
      await homeyService.callService('light', 'turn_on', { kelvin: command.kelvin }, target);
      return;
    case 'set_temperature':
      await homeyService.callService(
        'climate',
        'set_temperature',
        { temperature: command.temperature },
        target
      );
      return;
    case 'lock':
      await homeyService.callService('lock', 'lock', {}, target);
      return;
    case 'unlock':
      await homeyService.callService('lock', 'unlock', {}, target);
      return;
    case 'open':
      await homeyService.callService('cover', 'open_cover', {}, target);
      return;
    case 'close':
      await homeyService.callService('cover', 'close_cover', {}, target);
      return;
    case 'start':
      await homeyService.callService('vacuum', 'start', {}, target);
      return;
    case 'stop':
      await homeyService.callService('vacuum', 'pause', {}, target);
      return;
    case 'return_home':
      await homeyService.callService('vacuum', 'return_to_base', {}, target);
      return;
    case 'service':
      await homeyService.callService(
        command.domain,
        command.service,
        command.serviceData ?? {},
        (command.target as
          | {
              entity_id?: string | string[];
              area_id?: string | string[];
              device_id?: string | string[];
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
      const session = createProviderSessionMap(sessions).homey;
      return session ? buildProviderSession(session, homeyService.getSnapshot().connected) : null;
    },
    initializeSession: async (session) => {
      if (session.providerId !== 'homey') {
        return;
      }

      ensureHomeyApiClientConfigured();

      if ('homeySnapshot' in session && session.homeySnapshot) {
        homeyService.replaceSnapshot({
          connected: session.homeySnapshot.connected,
          devices: session.homeySnapshot.devices,
          zones: session.homeySnapshot.zones,
        });
        return;
      }

      await homeyService.loadSnapshot();
    },
    teardownSession: () => {
      homeyService.resetSnapshot();
    },
    getState: () => buildHomeyProviderState(homeyService.getSnapshot()),
    subscribeState: (listener) => homeyService.subscribe(() => listener()),
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
  contract: NavetProviderContract = createHomeyProviderContract()
) {
  return createSnapshotBackedProviderAdapter({
    providerId: 'homey',
    contract,
    executeCommand: executeHomeyCommand,
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
