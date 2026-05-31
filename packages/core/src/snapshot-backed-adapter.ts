import { ProviderAuthRequiredError } from './errors';
import { parseProviderScopedId } from './ids';
import type { IntegrationProviderId } from './integration-providers';
import type {
  NavetProviderContract,
  NavetProviderSessionInput,
  SmartHomeProviderAdapter,
} from './provider-contract';
import { areDataEqual } from './structural-equality';
import type { CommandResult, NavetCommand, NavetEntity, NavetEntityEvent } from './types';

function buildCommandResult(): CommandResult {
  return {
    accepted: true,
    requiresEventConfirmation: true,
  };
}

interface SnapshotBackedProviderAdapterOptions {
  providerId: IntegrationProviderId;
  providerLabel?: string;
  contract: NavetProviderContract;
  executeCommand: (entity: NavetEntity, command: NavetCommand) => Promise<void>;
  getSession?: () => NavetProviderSessionInput | null | undefined;
}

export function createSnapshotBackedProviderAdapter({
  providerId,
  providerLabel,
  contract,
  executeCommand,
  getSession,
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
      const session = getSession?.();
      if (!session) {
        throw new ProviderAuthRequiredError(
          `Provider session is required before connecting ${providerLabel ?? providerId}`
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
