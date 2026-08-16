import type { ChoreProjectionActionRequest } from '@navet/core/chore-projection';
import { buildChoreProjectionSnapshot } from '@navet/core/chore-projection';
import type { ChoreWorkspaceData } from '@navet/core/chores';
import { getCurrentIntegrationProviderIdFromStore } from './integration-provider-context.service';
import { getIntegrationProviderChoreProjectionFeatureService } from './integration-registry.service';

export async function publishIntegrationChoreProjection(input: {
  workspace: ChoreWorkspaceData;
  revision?: number;
  now?: string;
}) {
  const providerId = getCurrentIntegrationProviderIdFromStore();
  const service = getIntegrationProviderChoreProjectionFeatureService(providerId);
  if (!service) return false;
  await service.publishSnapshot(buildChoreProjectionSnapshot(input));
  return true;
}

export async function subscribeIntegrationChoreActionRequests(
  listener: (request: ChoreProjectionActionRequest) => void
) {
  const providerId = getCurrentIntegrationProviderIdFromStore();
  const service = getIntegrationProviderChoreProjectionFeatureService(providerId);
  if (!service?.subscribeActionRequests) return () => {};
  return await service.subscribeActionRequests(listener);
}
