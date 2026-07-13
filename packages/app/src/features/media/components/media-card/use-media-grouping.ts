import { dispatchEntityCommand } from '@navet/app/commands';
import { readNavetMediaState } from '@navet/app/core/navet-device-state';
import type { TranslateFn } from '@navet/app/hooks';
import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { getProviderNativeId, parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { areRecordValuesEqual } from '@navet/app/utils/structural-equality';
import { useCallback, useMemo } from 'react';

interface UseMediaGroupingParams {
  entityId: string;
  entities: PlatformEntitySnapshotMap | null | undefined;
  entityRegistry: PlatformEntityRegistryEntry[];
  groupMembers: string[];
  runAction: (action: () => Promise<void>, fallbackMessage: string) => Promise<void>;
  t: TranslateFn;
}

function formatIntegrationPlatform(platform: string) {
  const knownPlatforms: Record<string, string> = {
    music_assistant: 'Music Assistant',
    sonos: 'Sonos',
    spotify: 'Spotify',
    cast: 'Google Cast',
    apple_tv: 'Apple TV',
    universal: 'Universal media player',
  };
  return (
    knownPlatforms[platform] ??
    platform
      .split('_')
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ')
  );
}

function formatProviderName(providerId: string | null | undefined) {
  const knownProviders: Record<string, string> = {
    home_assistant: 'Home Assistant',
    homey: 'Homey',
    openhab: 'openHAB',
    hubitat: 'Hubitat',
    smartthings: 'SmartThings',
  };
  return providerId
    ? (knownProviders[providerId] ?? formatIntegrationPlatform(providerId))
    : undefined;
}

function getDeviceIdentity(registryEntry?: PlatformEntityRegistryEntry) {
  const rawManufacturer = registryEntry?.manufacturer?.trim();
  const manufacturer = rawManufacturer
    ? ({ apple: 'Apple', sonos: 'Sonos' }[rawManufacturer.toLowerCase()] ?? rawManufacturer)
    : undefined;
  const model = registryEntry?.model?.trim();
  if (manufacturer && model) {
    return model.toLowerCase().startsWith(manufacturer.toLowerCase())
      ? model
      : `${manufacturer} ${model}`;
  }
  return model || manufacturer || registryEntry?.deviceName?.trim() || undefined;
}

export function getGroupingPlayerIdentifier(
  entity: PlatformEntitySnapshot,
  registryEntry?: PlatformEntityRegistryEntry,
  providerId?: string | null
) {
  const deviceIdentity = getDeviceIdentity(registryEntry);
  if (deviceIdentity) {
    const integration = registryEntry?.platform
      ? formatIntegrationPlatform(registryEntry.platform)
      : undefined;
    return integration && !deviceIdentity.toLowerCase().startsWith(integration.toLowerCase())
      ? `${deviceIdentity} · ${integration}`
      : deviceIdentity;
  }
  if (registryEntry?.platform) return formatIntegrationPlatform(registryEntry.platform);
  const integration = entity.attributes?.integration ?? entity.attributes?.platform;
  if (typeof integration === 'string' && integration.trim()) {
    return formatIntegrationPlatform(integration.trim());
  }
  const appName = entity.attributes?.app_name;
  if (typeof appName === 'string' && appName.trim()) return appName.trim();
  return formatProviderName(providerId) ?? 'Media player';
}

export function useMediaGrouping({
  entityId,
  entities,
  entityRegistry,
  groupMembers,
  runAction,
  t,
}: UseMediaGroupingParams) {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const nativeEntityId = getProviderNativeId(entityId);
  const resolvedProviderId = parseProviderScopedId(entityId)?.providerId ?? currentProviderId;
  const groupingCandidates = useMemo(
    () =>
      Object.values(entities ?? {}).filter(
        (entity): entity is NonNullable<typeof entity> =>
          Boolean(entity) &&
          entity.entityId.startsWith('media_player.') &&
          entity.entityId !== nativeEntityId
      ),
    [entities, nativeEntityId]
  );
  const groupingCandidateIds = useMemo(
    () => groupingCandidates.map((entity) => entity.entityId),
    [groupingCandidates]
  );
  const registryByEntityId = useMemo(
    () => new Map(entityRegistry.map((entry) => [entry.entityId, entry] as const)),
    [entityRegistry]
  );
  const groupingEntitiesByEntityId = useIntegrationStore(
    (state) =>
      Object.fromEntries(
        groupingCandidateIds.map((candidateId) => [
          candidateId,
          integrationSelectors.providerEntityByLookup(resolvedProviderId, candidateId)(state),
        ])
      ),
    areRecordValuesEqual
  );

  const availableGroupingPlayers = useMemo(
    () =>
      groupingCandidates
        .filter((entity) => {
          const providerEntity = groupingEntitiesByEntityId[entity.entityId];
          return readNavetMediaState(providerEntity)?.supportsGrouping === true;
        })
        .map((entity) => ({
          id: entity.entityId,
          name:
            typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name
              ? entity.attributes.friendly_name
              : entity.entityId,
          isAttached: groupMembers.includes(entity.entityId),
          subtitle: getGroupingPlayerIdentifier(
            entity,
            registryByEntityId.get(entity.entityId),
            resolvedProviderId
          ),
        })),
    [
      groupMembers,
      groupingCandidates,
      groupingEntitiesByEntityId,
      registryByEntityId,
      resolvedProviderId,
    ]
  );
  const currentEntity = entities?.[nativeEntityId];
  const currentPlayerIdentifier = currentEntity
    ? getGroupingPlayerIdentifier(
        currentEntity,
        registryByEntityId.get(nativeEntityId),
        resolvedProviderId
      )
    : (formatProviderName(resolvedProviderId) ?? 'Media player');

  const attachGroupMember = useCallback(
    (memberEntityId: string) => {
      const nextGroupMembers = [...new Set([...groupMembers, memberEntityId])].filter(
        (memberId) => memberId !== entityId
      );
      if (nextGroupMembers.length === 0) {
        return;
      }

      void runAction(async () => {
        await dispatchEntityCommand({
          type: 'join_group',
          entityId,
          members: nextGroupMembers,
        });
      }, t('media.feedback.groupAttachFailed'));
    },
    [entityId, groupMembers, runAction, t]
  );

  const detachGroupMember = useCallback(
    (memberEntityId: string) => {
      void runAction(async () => {
        if (getProviderNativeId(memberEntityId) === nativeEntityId) {
          const remainingMembers = groupMembers.filter(
            (groupMemberId) => getProviderNativeId(groupMemberId) !== nativeEntityId
          );
          const nextCoordinator = remainingMembers[0];
          if (!nextCoordinator) {
            return;
          }

          await dispatchEntityCommand({
            type: 'join_group',
            entityId: nextCoordinator,
            members: [nativeEntityId, ...remainingMembers.slice(1)],
          });
        }

        await dispatchEntityCommand({ type: 'leave_group', entityId: memberEntityId });
      }, t('media.feedback.groupDetachFailed'));
    },
    [groupMembers, nativeEntityId, runAction, t]
  );

  return {
    availableGroupingPlayers,
    currentPlayerIdentifier,
    attachGroupMember,
    detachGroupMember,
  };
}
