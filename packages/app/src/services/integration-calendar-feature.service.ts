import type { ProviderCalendarFeatureService } from '@navet/app/platform/provider-feature-services';
import { resolveProviderFeatureService } from './integration-provider-service';

export const integrationCalendarFeatureService: ProviderCalendarFeatureService = {
  async getEvents(entityId, options) {
    const { nativeEntityId, service } = resolveProviderFeatureService({
      entityId,
      feature: 'calendar',
      getService: (registration) => registration.calendarFeatureService,
      unsupportedMessage: 'Calendar events are not supported for the current integration yet',
      missingMessage: 'Calendar support is not implemented yet for the current integration',
    });
    if (!nativeEntityId) {
      throw new Error('Calendar events require an entity id');
    }
    return await service.getEvents(nativeEntityId, options);
  },
};
