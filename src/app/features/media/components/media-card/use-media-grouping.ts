import { dispatchEntityCommand } from '@navet/app/commands';
import { useCallback, useMemo } from 'react';
import { readNavetMediaState } from '@/app/core/navet-device-state';
import type { TranslateFn } from '@/app/hooks';
import { useIntegrationStore } from '@/app/hooks/use-integration-store';
import type { PlatformEntitySnapshotMap } from '@/app/platform/provider-feature-models';
import { integrationSelectors } from '@/app/stores/selectors';
import { getProviderNativeId, parseProviderScopedId } from '@/app/utils/provider-ids';
import { areRecordValuesEqual } from '@/app/utils/structural-equality';

interface UseMediaGroupingParams {
  entityId: string;
  entities: PlatformEntitySnapshotMap | null | undefined;
  groupMembers: string[];
  runAction: (action: () => Promise<void>, fallbackMessage: string) => Promise<void>;
  t: TranslateFn;
}

export function useMediaGrouping({
  entityId,
  entities,
  groupMembers,
  runAction,
  t,
}: UseMediaGroupingParams) {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const nativeEntityId = getProviderNativeId(entityId);
  const resolvedProviderId = parseProviderScopedId(entityId)?.providerId ?? currentProviderId;
  const groupingCandidateIds = useMemo(
    () =>
      Object.values(entities ?? {})
        .filter(
          (entity): entity is NonNullable<typeof entity> =>
            Boolean(entity) &&
            entity.entityId.startsWith('media_player.') &&
            entity.entityId !== nativeEntityId
        )
        .map((entity) => entity.entityId),
    [entities, nativeEntityId]
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
      Object.values(entities ?? {})
        .filter(
          (entity): entity is NonNullable<typeof entity> =>
            Boolean(entity) &&
            entity.entityId.startsWith('media_player.') &&
            entity.entityId !== nativeEntityId
        )
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
        })),
    [entities, groupMembers, groupingEntitiesByEntityId, nativeEntityId]
  );

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
      if (memberEntityId === entityId) {
        return;
      }

      void runAction(async () => {
        await dispatchEntityCommand({ type: 'leave_group', entityId: memberEntityId });
      }, t('media.feedback.groupDetachFailed'));
    },
    [entityId, runAction, t]
  );

  return {
    availableGroupingPlayers,
    attachGroupMember,
    detachGroupMember,
  };
}
