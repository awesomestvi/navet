import { getRegisteredSmartHomeProviderAdapter } from '@navet/app/provider-contract-registry';
import type { CommandResult, NavetCommand, NavetUiCommand } from '@navet/core/types';
import type { IntegrationProviderId } from '../types/provider';
import { resolveIntegrationProviderId } from './integration-provider-context.service';

export async function dispatchNavetCommand(
  command: NavetCommand,
  providerId?: IntegrationProviderId
): Promise<CommandResult> {
  const resolvedProviderId = resolveProviderId(providerId, command.entityId);
  const adapter = getRegisteredSmartHomeProviderAdapter(resolvedProviderId);

  return await adapter.execute(command);
}

export async function dispatchEntityCommand(
  command: NavetUiCommand,
  providerId?: IntegrationProviderId
): Promise<CommandResult> {
  return await dispatchNavetCommand(command, providerId);
}

function resolveProviderId(
  providerId: IntegrationProviderId | undefined,
  entityId?: string
): IntegrationProviderId {
  return resolveIntegrationProviderId(entityId, providerId);
}
