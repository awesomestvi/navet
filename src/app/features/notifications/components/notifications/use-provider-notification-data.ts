import type { HassEntity } from 'home-assistant-js-websocket';
import { shallow } from 'zustand/shallow';
import { useProviderFeature } from '@/app/hooks';
import { selectUpdateDomainEntities } from '@/app/hooks/ha-domain-entity-maps';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import type {
  PlatformNotificationSnapshot,
  PlatformUpdateNotificationCandidate,
} from '@/app/platform/provider-feature-models';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { useHaNotificationData } from './use-ha-notification-data';

export interface ProviderNotificationData extends PlatformNotificationSnapshot {
  entitiesHydrated: boolean;
  updateCandidates: PlatformUpdateNotificationCandidate[];
}

const EMPTY_NOTIFICATION_DATA: ProviderNotificationData = {
  entitiesHydrated: false,
  persistentNotifications: [],
  repairIssues: [],
  updateCandidates: [],
};

export function mapHomeAssistantUpdateCandidates(
  updateEntities: Record<string, HassEntity>
): PlatformUpdateNotificationCandidate[] {
  return Object.entries(updateEntities).map(([entityId, entity]) => {
    const releaseNotes =
      typeof entity.attributes?.release_notes === 'string' ? entity.attributes.release_notes : null;
    const detailsUrl =
      typeof entity.attributes?.release_url === 'string'
        ? entity.attributes.release_url
        : typeof entity.attributes?.release_notes_url === 'string'
          ? entity.attributes.release_notes_url
          : releaseNotes && /^https?:\/\//i.test(releaseNotes)
            ? releaseNotes
            : null;
    const rawProgress =
      typeof entity.attributes?.update_percentage === 'number'
        ? entity.attributes.update_percentage
        : typeof entity.attributes?.update_progress === 'number'
          ? entity.attributes.update_progress
          : null;

    const candidate: PlatformUpdateNotificationCandidate = {
      entityId,
      state: entity.state,
      inProgress: Boolean(entity.attributes?.in_progress),
    };

    if (typeof entity.attributes?.friendly_name === 'string') {
      candidate.friendlyName = entity.attributes.friendly_name;
    }

    candidate.installedVersion =
      typeof entity.attributes?.installed_version === 'string'
        ? entity.attributes.installed_version
        : null;
    candidate.latestVersion =
      typeof entity.attributes?.latest_version === 'string'
        ? entity.attributes.latest_version
        : null;
    candidate.releaseSummary =
      typeof entity.attributes?.release_summary === 'string'
        ? entity.attributes.release_summary
        : null;
    candidate.releaseNotes =
      releaseNotes && !/^https?:\/\//i.test(releaseNotes) ? releaseNotes : null;
    candidate.detailsUrl = detailsUrl;
    candidate.progress =
      typeof rawProgress === 'number' && !Number.isNaN(rawProgress)
        ? Math.max(0, Math.min(100, Math.round(rawProgress)))
        : null;

    if (typeof entity.last_changed === 'string') {
      candidate.lastChanged = entity.last_changed;
    }

    if (typeof entity.last_updated === 'string') {
      candidate.lastUpdated = entity.last_updated;
    }

    return candidate;
  });
}

export function useProviderNotificationData(): ProviderNotificationData {
  const supportsNotifications = useProviderFeature('notifications');
  const haData = useHaNotificationData();
  const entitiesHydrated = useHomeAssistant(homeAssistantSelectors.entitiesHydrated);
  const updateEntities = useHomeAssistant(selectUpdateDomainEntities, shallow);

  if (!supportsNotifications) {
    return EMPTY_NOTIFICATION_DATA;
  }

  return {
    ...haData,
    entitiesHydrated,
    updateCandidates: mapHomeAssistantUpdateCandidates(updateEntities),
  };
}
