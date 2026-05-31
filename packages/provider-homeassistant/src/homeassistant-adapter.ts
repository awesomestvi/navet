import { UnsupportedProviderCommandError } from '@navet/core/errors';
import { INTEGRATION_PROVIDERS } from '@navet/core/integration-providers';
import type {
  NavetProviderContract,
  NavetProviderSessionInput,
  NavetProviderSessionMap,
  NavetResourceResolveRequest,
  ResolvedPlatformResource,
} from '@navet/core/provider-contract';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type { NavetCommand, NavetEntity, NavetProviderState } from '@navet/core/types';
import {
  buildHomeAssistantProviderRooms,
  mapHomeAssistantEntitiesToNavetEntities,
} from './homeassistant-mappers';
import {
  addHomeAssistantListener,
  callHomeAssistantService,
  getHomeAssistantStoreState,
  type HomeAssistantPanelHass,
  isHomeAssistantConnected,
  resolveHomeAssistantArtwork,
  resolveHomeAssistantProxyUrl,
} from './homeassistant-service-bridge';

interface HomeAssistantProviderSessionInput extends NavetProviderSessionInput {
  providerId: 'home_assistant';
}

function getHomeAssistantProviderSession(
  sessions: NavetProviderSessionMap
): HomeAssistantProviderSessionInput | null {
  const session = sessions.home_assistant;
  return session?.providerId === 'home_assistant'
    ? (session as HomeAssistantProviderSessionInput)
    : null;
}

function buildProviderSession(session: HomeAssistantProviderSessionInput, connected: boolean) {
  return {
    providerId: session.providerId,
    connected,
    runtime: session.runtime,
    authMode: session.authMode,
  };
}

function getHomeAssistantState(): NavetProviderState {
  const state = getHomeAssistantStoreState();

  return {
    providerId: 'home_assistant',
    connected: state.connected,
    entities: mapHomeAssistantEntitiesToNavetEntities({
      entities: state.entities,
      areas: state.areas,
      deviceRegistry: state.deviceRegistry,
      entityRegistry: state.entityRegistry,
    }),
    rooms: buildHomeAssistantProviderRooms({
      entities: state.entities,
      areas: state.areas,
      deviceRegistry: state.deviceRegistry,
      entityRegistry: state.entityRegistry,
    }),
  };
}

async function resolveHomeAssistantResource(
  request: NavetResourceResolveRequest
): Promise<ResolvedPlatformResource> {
  if (request.kind !== 'media_artwork') {
    return {
      id: request.deviceId,
      kind: 'unavailable',
      cacheKey: request.deviceId,
      authStrategy: 'none',
    };
  }

  return await resolveHomeAssistantArtwork(
    request.deviceId.replace(/^home_assistant:/, ''),
    request.attrs ?? {},
    request.fallbackPicture
  );
}

function getEntityCommandDomain(entity: NavetEntity): string {
  if (entity.externalId.includes('.')) {
    return entity.externalId.split('.', 1)[0] || 'homeassistant';
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
      return 'homeassistant';
  }
}

async function executeHomeAssistantCommand(entity: NavetEntity, command: NavetCommand) {
  switch (command.type) {
    case 'turn_on':
      await callHomeAssistantService(
        getEntityCommandDomain(entity),
        'turn_on',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'turn_off':
      await callHomeAssistantService(
        getEntityCommandDomain(entity),
        'turn_off',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'set_fan_speed':
      await callHomeAssistantService(
        'fan',
        'set_percentage',
        { percentage: command.percentage },
        { entity_id: entity.externalId }
      );
      return;
    case 'play_pause':
      await callHomeAssistantService(
        'media_player',
        'media_play_pause',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'previous_track':
      await callHomeAssistantService(
        'media_player',
        'media_previous_track',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'next_track':
      await callHomeAssistantService(
        'media_player',
        'media_next_track',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'set_volume':
      await callHomeAssistantService(
        'media_player',
        'volume_set',
        { volume_level: command.volume / 100 },
        { entity_id: entity.externalId }
      );
      return;
    case 'mute':
      await callHomeAssistantService(
        'media_player',
        'volume_mute',
        { is_volume_muted: true },
        { entity_id: entity.externalId }
      );
      return;
    case 'unmute':
      await callHomeAssistantService(
        'media_player',
        'volume_mute',
        { is_volume_muted: false },
        { entity_id: entity.externalId }
      );
      return;
    case 'set_shuffle':
      await callHomeAssistantService(
        'media_player',
        'shuffle_set',
        { shuffle: command.shuffle },
        { entity_id: entity.externalId }
      );
      return;
    case 'set_repeat_mode':
      await callHomeAssistantService(
        'media_player',
        'repeat_set',
        { repeat: command.repeatMode },
        { entity_id: entity.externalId }
      );
      return;
    case 'join_group':
      await callHomeAssistantService(
        'media_player',
        'join',
        { group_members: command.members },
        { entity_id: entity.externalId }
      );
      return;
    case 'leave_group':
      await callHomeAssistantService(
        'media_player',
        'unjoin',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'set_climate_mode':
      await callHomeAssistantService(
        entity.externalId.startsWith('water_heater.') ? 'water_heater' : 'climate',
        entity.externalId.startsWith('water_heater.') ? 'set_operation_mode' : 'set_hvac_mode',
        entity.externalId.startsWith('water_heater.')
          ? { operation_mode: command.mode }
          : { hvac_mode: command.mode },
        { entity_id: entity.externalId }
      );
      return;
    case 'set_brightness':
      await callHomeAssistantService(
        'light',
        'turn_on',
        { brightness_pct: command.brightness },
        { entity_id: entity.externalId }
      );
      return;
    case 'set_color_temperature':
      await callHomeAssistantService(
        'light',
        'turn_on',
        { color_temp_kelvin: command.kelvin },
        { entity_id: entity.externalId }
      );
      return;
    case 'set_temperature':
      await callHomeAssistantService(
        entity.externalId.startsWith('water_heater.') ? 'water_heater' : 'climate',
        'set_temperature',
        { temperature: command.temperature },
        { entity_id: entity.externalId }
      );
      return;
    case 'lock':
      await callHomeAssistantService('lock', 'lock', {}, { entity_id: entity.externalId });
      return;
    case 'unlock':
      await callHomeAssistantService('lock', 'unlock', {}, { entity_id: entity.externalId });
      return;
    case 'open':
      await callHomeAssistantService('cover', 'open_cover', {}, { entity_id: entity.externalId });
      return;
    case 'close':
      await callHomeAssistantService(
        'cover',
        'close_cover',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'start':
      await callHomeAssistantService('vacuum', 'start', {}, { entity_id: entity.externalId });
      return;
    case 'stop':
      await callHomeAssistantService('vacuum', 'pause', {}, { entity_id: entity.externalId });
      return;
    case 'return_home':
      await callHomeAssistantService(
        'vacuum',
        'return_to_base',
        {},
        {
          entity_id: entity.externalId,
        }
      );
      return;
    case 'service':
      await callHomeAssistantService(
        command.domain,
        command.service,
        command.serviceData ?? {},
        command.target ?? { entity_id: entity.externalId }
      );
      return;
    default:
      throw new UnsupportedProviderCommandError((command as { type: string }).type);
  }
}

export function createHomeAssistantProviderContract(): NavetProviderContract {
  return {
    providerId: 'home_assistant',
    bootstrapSession: (sessions) => {
      const session = getHomeAssistantProviderSession(sessions);
      return session ? buildProviderSession(session, isHomeAssistantConnected()) : null;
    },
    initializeSession: async (session) => {
      if (session.providerId !== 'home_assistant') {
        return;
      }

      await getHomeAssistantStoreState().connect(session);
    },
    attachRuntimeBridge: (bridge) => {
      getHomeAssistantStoreState().syncPanelHass(bridge as HomeAssistantPanelHass);
    },
    teardownSession: () => {
      void getHomeAssistantStoreState().disconnect();
    },
    getState: getHomeAssistantState,
    subscribeState: (listener) => {
      const unsubscribers = [
        addHomeAssistantListener('entities', listener),
        addHomeAssistantListener('registries', listener),
        addHomeAssistantListener('connection', listener),
      ];

      return () => {
        for (const unsubscribe of unsubscribers) {
          unsubscribe();
        }
      };
    },
    resolveResource: resolveHomeAssistantResource,
    normalizeResourceUrl: (resourceUrl) => resolveHomeAssistantProxyUrl(resourceUrl) ?? resourceUrl,
  };
}

export function createHomeAssistantContractAdapter(
  contract: NavetProviderContract = createHomeAssistantProviderContract(),
  options: {
    getSession?: () => NavetProviderSessionInput | null | undefined;
  } = {}
) {
  return createSnapshotBackedProviderAdapter({
    providerId: 'home_assistant',
    providerLabel: INTEGRATION_PROVIDERS.home_assistant.label,
    contract,
    executeCommand: executeHomeAssistantCommand,
    getSession: options.getSession,
  });
}
