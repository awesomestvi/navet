import { useCallback, useMemo } from 'react';
import type { useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface UseMediaGroupingParams {
  entityId: string;
  entities:
    | Record<string, { entity_id: string; attributes?: Record<string, unknown> }>
    | null
    | undefined;
  groupMembers: string[];
  runAction: (action: () => Promise<void>, fallbackMessage: string) => Promise<void>;
  t: ReturnType<typeof useI18n>['t'];
}

export function useMediaGrouping({
  entityId,
  entities,
  groupMembers,
  runAction,
  t,
}: UseMediaGroupingParams) {
  const availableGroupingPlayers = useMemo(
    () =>
      Object.values(entities ?? {})
        .filter(
          (entity): entity is NonNullable<typeof entity> =>
            Boolean(entity) &&
            entity.entity_id.startsWith('media_player.') &&
            entity.entity_id !== entityId &&
            typeof entity.attributes?.supported_features === 'number' &&
            (entity.attributes.supported_features & 524288) === 524288
        )
        .map((entity) => ({
          id: entity.entity_id,
          name:
            typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name
              ? entity.attributes.friendly_name
              : entity.entity_id,
          isAttached: groupMembers.includes(entity.entity_id),
        })),
    [entities, entityId, groupMembers]
  );

  const attachGroupMember = useCallback(
    (memberEntityId: string) => {
      const nextGroupMembers = [...new Set([...groupMembers, memberEntityId])].filter(
        (memberId) => memberId !== entityId
      );
      if (nextGroupMembers.length === 0) {
        return;
      }

      void runAction(
        () => homeAssistantService.joinMediaPlayers(entityId, nextGroupMembers),
        t('media.feedback.groupAttachFailed')
      );
    },
    [entityId, groupMembers, runAction, t]
  );

  const detachGroupMember = useCallback(
    (memberEntityId: string) => {
      if (memberEntityId === entityId) {
        return;
      }

      void runAction(
        () => homeAssistantService.unjoinMediaPlayer(memberEntityId),
        t('media.feedback.groupDetachFailed')
      );
    },
    [entityId, runAction, t]
  );

  return {
    availableGroupingPlayers,
    attachGroupMember,
    detachGroupMember,
  };
}
