import { useIntegrationStore } from '@/app/hooks';
import { useProviderEntitySnapshots } from '@/app/hooks/use-provider-entity';
import type {
  PlatformEntitySnapshotMap,
  PlatformUpdateNotificationCandidate,
} from '@/app/platform/provider-feature-models';
import { integrationSelectors } from '@/app/stores/selectors';

const EMPTY_UPDATE_ENTITIES: PlatformEntitySnapshotMap = {};

function selectNoUpdateEntities(): PlatformEntitySnapshotMap {
  return EMPTY_UPDATE_ENTITIES;
}

export function mapHomeAssistantUpdateCandidates(
  updateEntities: PlatformEntitySnapshotMap
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

    if (typeof entity.lastChanged === 'string') {
      candidate.lastChanged = entity.lastChanged;
    }

    if (typeof entity.lastUpdated === 'string') {
      candidate.lastUpdated = entity.lastUpdated;
    }

    return candidate;
  });
}

function selectProviderUpdateEntities(
  entities: PlatformEntitySnapshotMap | null
): PlatformEntitySnapshotMap {
  if (!entities) {
    return EMPTY_UPDATE_ENTITIES;
  }

  return Object.fromEntries(
    Object.entries(entities).filter(([entityId]) => entityId.startsWith('update.'))
  );
}

export function useProviderUpdateCandidates(): PlatformUpdateNotificationCandidate[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = currentProviderId === 'home_assistant';
  const entities = useProviderEntitySnapshots({ enabled: isHomeAssistantProvider });
  const updateEntities = isHomeAssistantProvider
    ? selectProviderUpdateEntities(entities)
    : selectNoUpdateEntities();

  if (!isHomeAssistantProvider) {
    return [];
  }

  return mapHomeAssistantUpdateCandidates(updateEntities);
}
