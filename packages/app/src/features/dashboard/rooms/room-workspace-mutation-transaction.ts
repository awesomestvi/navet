import { getProviderRoomManagementCapabilities } from '@navet/app/provider-runtime-registry';
import { executeIntegrationRoomMutationPlan } from '@navet/app/services/integration-admin.service';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import type {
  PlatformRoomMutationStep,
  ProviderRoomManagementCapabilities,
} from '@navet/core/provider-feature-models';
import type { NavetEntity } from '@navet/core/types';
import {
  buildRoomWorkspaceIndexV2,
  type RoomWorkspaceRoomId,
  type RoomWorkspaceRoomV2,
  type RoomWorkspaceSourceRefV2,
  type RoomWorkspaceV2,
} from './room-workspace-v2';

export interface PendingProviderRoomDeletion {
  room: RoomWorkspaceRoomV2;
  sourceRef: RoomWorkspaceSourceRefV2;
  memberIds: string[];
}

interface RoomWorkspaceMutationTransactionInput {
  committedWorkspace: RoomWorkspaceV2 | null;
  draftWorkspace: RoomWorkspaceV2;
  entitiesByCanonicalId: Record<string, NavetEntity>;
  pendingPlacements: Record<string, RoomWorkspaceRoomId | null>;
  pendingProviderDeletions: PendingProviderRoomDeletion[];
  roomIdsByEntityId: Record<string, string>;
}

interface RoomWorkspaceMutationTransactionEffects {
  clearRoomOverride: (entityId: string) => void;
  replaceWorkspace: (workspace: RoomWorkspaceV2) => RoomWorkspaceV2 | null;
  setRoomOverride: (entityId: string, roomId: string) => void;
  executePlan?: typeof executeIntegrationRoomMutationPlan;
  getCapabilities?: (providerId: IntegrationProviderId) => ProviderRoomManagementCapabilities;
}

export type RoomWorkspaceMutationTransactionResult =
  | { kind: 'saved'; workspace: RoomWorkspaceV2 }
  | {
      kind: 'partial' | 'error';
      failureCount: number;
      pendingPlacements: Record<string, RoomWorkspaceRoomId | null>;
      pendingProviderDeletions: PendingProviderRoomDeletion[];
    };

interface MutationPlan {
  failedLocalEntityIds: string[];
  localPlacements: Array<[string, RoomWorkspaceRoomId | null]>;
  providerSteps: Map<IntegrationProviderId, PlatformRoomMutationStep[]>;
  stepDeletionRoomIds: Map<string, RoomWorkspaceRoomId>;
  stepEntityIds: Map<string, string>;
}

function getEntityOverrideId(entity: NavetEntity, roomIdsByEntityId: Record<string, string>) {
  return (
    roomIdsByEntityId[entity.canonicalId] ??
    roomIdsByEntityId[entity.id] ??
    roomIdsByEntityId[entity.externalId] ??
    null
  );
}

function appendProviderStep(
  providerSteps: Map<IntegrationProviderId, PlatformRoomMutationStep[]>,
  providerId: IntegrationProviderId,
  step: PlatformRoomMutationStep
) {
  const steps = providerSteps.get(providerId) ?? [];
  steps.push(step);
  providerSteps.set(providerId, steps);
}

export function buildRoomWorkspaceMutationPlan(
  input: RoomWorkspaceMutationTransactionInput,
  getCapabilities = getProviderRoomManagementCapabilities
): MutationPlan {
  const providerSteps = new Map<IntegrationProviderId, PlatformRoomMutationStep[]>();
  const localPlacements: Array<[string, RoomWorkspaceRoomId | null]> = [];
  const failedLocalEntityIds: string[] = [];
  const stepEntityIds = new Map<string, string>();
  const stepDeletionRoomIds = new Map<string, RoomWorkspaceRoomId>();
  const draftIndex = buildRoomWorkspaceIndexV2(input.draftWorkspace);
  const committedIndex = input.committedWorkspace
    ? buildRoomWorkspaceIndexV2(input.committedWorkspace)
    : null;
  let stepIndex = 0;

  for (const room of input.draftWorkspace.rooms) {
    const committedRoom = committedIndex?.roomById.get(room.id);
    if (
      !committedRoom ||
      committedRoom.displayName === room.displayName ||
      room.sourceRefs.length !== 1
    ) {
      continue;
    }
    const sourceRef = room.sourceRefs[0];
    if (!getCapabilities(sourceRef.providerId).rename) continue;
    appendProviderStep(providerSteps, sourceRef.providerId, {
      stepId: `rename-${stepIndex}`,
      operation: 'rename',
      roomId: sourceRef.canonicalId,
      name: room.displayName,
    });
    stepIndex += 1;
  }

  for (const [entityId, targetRoomId] of Object.entries(input.pendingPlacements)) {
    const entity = input.entitiesByCanonicalId[entityId];
    if (!entity) {
      failedLocalEntityIds.push(entityId);
      continue;
    }
    const capabilities = getCapabilities(entity.providerId);
    const providerTarget = targetRoomId
      ? draftIndex.roomById
          .get(targetRoomId)
          ?.sourceRefs.find((sourceRef) => sourceRef.providerId === entity.providerId)
      : null;
    const stepId = `placement-${stepIndex}`;
    stepIndex += 1;

    if (targetRoomId && providerTarget && capabilities.assign) {
      appendProviderStep(providerSteps, entity.providerId, {
        stepId,
        operation: 'assign',
        entityId,
        roomId: providerTarget.canonicalId,
      });
      stepEntityIds.set(stepId, entityId);
    } else if (!targetRoomId && getEntityOverrideId(entity, input.roomIdsByEntityId)) {
      localPlacements.push([entityId, null]);
    } else if (!targetRoomId && capabilities.unassign) {
      appendProviderStep(providerSteps, entity.providerId, {
        stepId,
        operation: 'unassign',
        entityId,
      });
      stepEntityIds.set(stepId, entityId);
    } else if (targetRoomId) {
      localPlacements.push([entityId, targetRoomId]);
    } else {
      failedLocalEntityIds.push(entityId);
    }
  }

  for (const deletion of input.pendingProviderDeletions) {
    const dependencies = (providerSteps.get(deletion.sourceRef.providerId) ?? [])
      .filter((step) => 'entityId' in step && deletion.memberIds.includes(step.entityId))
      .map((step) => step.stepId);
    const stepId = `delete-${stepIndex}`;
    appendProviderStep(providerSteps, deletion.sourceRef.providerId, {
      stepId,
      operation: 'delete',
      roomId: deletion.sourceRef.canonicalId,
      dependsOn: dependencies,
    });
    stepDeletionRoomIds.set(stepId, deletion.room.id);
    stepIndex += 1;
  }

  return {
    failedLocalEntityIds,
    localPlacements,
    providerSteps,
    stepDeletionRoomIds,
    stepEntityIds,
  };
}

export async function executeRoomWorkspaceMutationTransaction(
  input: RoomWorkspaceMutationTransactionInput,
  effects: RoomWorkspaceMutationTransactionEffects
): Promise<RoomWorkspaceMutationTransactionResult> {
  const normalizedNames = input.draftWorkspace.rooms.map((room) =>
    room.displayName.trim().toLocaleLowerCase()
  );
  if (
    normalizedNames.some((name) => !name) ||
    new Set(normalizedNames).size !== normalizedNames.length
  ) {
    return {
      kind: 'error',
      failureCount: 1,
      pendingPlacements: input.pendingPlacements,
      pendingProviderDeletions: input.pendingProviderDeletions,
    };
  }

  const plan = buildRoomWorkspaceMutationPlan(
    input,
    effects.getCapabilities ?? getProviderRoomManagementCapabilities
  );
  const executePlan = effects.executePlan ?? executeIntegrationRoomMutationPlan;
  const successfulEntityIds = new Set<string>();
  const successfulDeletionRoomIds = new Set<RoomWorkspaceRoomId>();
  let providerFailureCount = 0;
  let providerSuccessCount = 0;

  try {
    for (const [providerId, steps] of plan.providerSteps) {
      const result = await executePlan({ providerId, steps });
      providerFailureCount += result.failures.length;
      providerSuccessCount += result.successes.length;
      for (const success of result.successes) {
        const entityId = plan.stepEntityIds.get(success.stepId);
        if (entityId) successfulEntityIds.add(entityId);
        const roomId = plan.stepDeletionRoomIds.get(success.stepId);
        if (roomId) successfulDeletionRoomIds.add(roomId);
      }
    }
  } catch {
    return {
      kind: 'error',
      failureCount: 1,
      pendingPlacements: input.pendingPlacements,
      pendingProviderDeletions: input.pendingProviderDeletions,
    };
  }

  const failureCount = providerFailureCount + plan.failedLocalEntityIds.length;
  if (failureCount > 0) {
    return {
      kind: providerSuccessCount > 0 ? 'partial' : 'error',
      failureCount,
      pendingPlacements: Object.fromEntries(
        Object.entries(input.pendingPlacements).filter(
          ([entityId]) => !successfulEntityIds.has(entityId)
        )
      ),
      pendingProviderDeletions: input.pendingProviderDeletions.filter(
        (deletion) => !successfulDeletionRoomIds.has(deletion.room.id)
      ),
    };
  }

  for (const [entityId, roomId] of plan.localPlacements) {
    if (roomId) effects.setRoomOverride(entityId, roomId);
    else effects.clearRoomOverride(entityId);
  }
  const localEntityIds = new Set(plan.localPlacements.map(([entityId]) => entityId));
  for (const entityId of successfulEntityIds) {
    if (!localEntityIds.has(entityId)) effects.clearRoomOverride(entityId);
  }

  const workspace = effects.replaceWorkspace(input.draftWorkspace);
  if (!workspace) {
    return {
      kind: 'error',
      failureCount: 1,
      pendingPlacements: input.pendingPlacements,
      pendingProviderDeletions: input.pendingProviderDeletions,
    };
  }
  return { kind: 'saved', workspace };
}
