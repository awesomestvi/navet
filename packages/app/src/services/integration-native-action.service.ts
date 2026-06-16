import { maybeHandlePreviewServiceCall } from '@navet/app/preview/preview-action-bridge';
import type { IntegrationServiceTarget } from '@navet/app/types/integration-service';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { resolveProviderService } from './integration-provider-service';

export interface IntegrationNativeActionRequest {
  providerId?: IntegrationProviderId;
  entityId?: string;
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
  target?: IntegrationServiceTarget;
}

export async function invokeIntegrationNativeAction({
  providerId,
  entityId,
  domain,
  service,
  serviceData = {},
  target,
}: IntegrationNativeActionRequest): Promise<void> {
  const handledByPreview = await maybeHandlePreviewServiceCall({
    entityId,
    domain,
    service,
    serviceData,
    target,
  });
  if (handledByPreview) {
    return;
  }

  const resolved = resolveProviderService({
    entityId,
    providerId,
    getService: (registration) => registration.nativeActionFeatureService,
    missingMessage: 'Native provider actions are not implemented yet for the current integration',
  });

  await resolved.service.invokeAction({
    entityId: resolved.nativeEntityId ?? undefined,
    domain,
    service,
    serviceData,
    target,
  });
}
