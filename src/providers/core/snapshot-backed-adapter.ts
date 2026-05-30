import type { NavetProviderContract } from '@navet/app/internal/compat';
import { INTEGRATION_PROVIDERS, type IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { areDataEqual } from '@/app/utils/structural-equality';
import { integrationSessionRuntime } from '@/auth/integration-session-runtime';
import { ProviderAuthRequiredError } from './errors';
import type { SmartHomeProviderAdapter } from './provider-contract';
import type { CommandResult, NavetCommand, NavetEntity, NavetEntityEvent } from './types';

function buildCommandResult(): CommandResult {
  return {
    accepted: true,
    requiresEventConfirmation: true,
  };
}

interface SnapshotBackedProviderAdapterOptions {
  providerId: IntegrationProviderId;
  contract: NavetProviderContract;
  executeCommand: (entity: NavetEntity, command: NavetCommand) => Promise<void>;
}

export function createSnapshotBackedProviderAdapter({
  providerId,
  contract,
  executeCommand,
}: SnapshotBackedProviderAdapterOptions): SmartHomeProviderAdapter {
  const listEntities = async () => contract.getState().entities;

  const getEntity = async (id: string) => {
    const entities = await listEntities();

    return (
      entities.find(
        (entity) =>
          entity.id === id ||
          entity.canonicalId === id ||
          entity.externalId === id ||
          parseProviderScopedId(id)?.nativeId === entity.externalId
      ) ?? null
    );
  };

  return {
    async connect() {
      const session = integrationSessionRuntime.getSnapshot().sessions[providerId];
      if (!session) {
        throw new ProviderAuthRequiredError(
          `Provider session is required before connecting ${INTEGRATION_PROVIDERS[providerId].label}`
        );
      }

      await contract.initializeSession?.(session);
    },
    async disconnect() {
      contract.teardownSession?.();
    },
    listEntities,
    getEntity,
    async execute(command) {
      const entity = await getEntity(command.entityId);
      if (!entity) {
        throw new Error(`Unknown provider entity: ${command.entityId}`);
      }

      await executeCommand(entity, command);
      return buildCommandResult();
    },
    async subscribeToEvents(callback) {
      if (!contract.subscribeState) {
        return () => {};
      }

      let previousEntities = new Map<string, NavetEntity>(
        contract.getState().entities.map((entity) => [entity.id, entity])
      );

      return (
        contract.subscribeState?.(() => {
          const nextEntities = new Map<string, NavetEntity>(
            contract.getState().entities.map((entity) => [entity.id, entity])
          );
          const timestamp = new Date().toISOString();

          for (const [entityId, entity] of nextEntities) {
            const previous = previousEntities.get(entityId);
            if (!previous) {
              callback({
                type: 'entity_added',
                providerId,
                entityId,
                entity,
                at: timestamp,
              } satisfies NavetEntityEvent);
              continue;
            }

            if (!areDataEqual(previous, entity)) {
              callback({
                type: 'entity_updated',
                providerId,
                entityId,
                entity,
                at: timestamp,
              } satisfies NavetEntityEvent);
            }
          }

          for (const [entityId] of previousEntities) {
            if (!nextEntities.has(entityId)) {
              callback({
                type: 'entity_removed',
                providerId,
                entityId,
                at: timestamp,
              } satisfies NavetEntityEvent);
            }
          }

          previousEntities = nextEntities;
        }) ?? (() => {})
      );
    },
  };
}
