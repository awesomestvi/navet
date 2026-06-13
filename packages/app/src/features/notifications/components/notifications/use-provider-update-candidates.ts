import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderEntitySnapshots } from '@navet/app/hooks/use-provider-entity';
import type {
  PlatformEntitySnapshotMap,
  PlatformUpdateNotificationCandidate,
} from '@navet/app/platform/provider-feature-models';
import { integrationSelectors } from '@navet/app/stores/selectors';

const EMPTY_UPDATE_ENTITIES: PlatformEntitySnapshotMap = {};

const HTML_ENTITY_REPLACEMENTS: Record<string, string> = {
  '&amp;': '&',
  '&apos;': "'",
  '&gt;': '>',
  '&lt;': '<',
  '&nbsp;': ' ',
  '&quot;': '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(amp|apos|gt|lt|nbsp|quot);/g,
    (entity) => HTML_ENTITY_REPLACEMENTS[entity] ?? entity
  );
}

function normalizeUpdateText(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(ha-alert|p|div|li|ul|ol|h[1-6])>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

function detectRestartRequired(...values: Array<string | null | undefined>): boolean {
  const normalized = values.filter(Boolean).join('\n').toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('restart of home assistant required') ||
    normalized.includes('restart home assistant to finish update') ||
    (normalized.includes('restart') &&
      normalized.includes('home assistant') &&
      normalized.includes('required'))
  );
}

function selectNoUpdateEntities(): PlatformEntitySnapshotMap {
  return EMPTY_UPDATE_ENTITIES;
}

export function mapHomeAssistantUpdateCandidates(
  updateEntities: PlatformEntitySnapshotMap
): PlatformUpdateNotificationCandidate[] {
  return Object.entries(updateEntities).map(([entityId, entity]) => {
    const rawReleaseNotes =
      typeof entity.attributes?.release_notes === 'string' ? entity.attributes.release_notes : null;
    const detailsUrl =
      typeof entity.attributes?.release_url === 'string'
        ? entity.attributes.release_url
        : typeof entity.attributes?.release_notes_url === 'string'
          ? entity.attributes.release_notes_url
          : rawReleaseNotes && /^https?:\/\//i.test(rawReleaseNotes)
            ? rawReleaseNotes
            : null;
    const releaseNotes =
      rawReleaseNotes && !/^https?:\/\//i.test(rawReleaseNotes)
        ? normalizeUpdateText(rawReleaseNotes)
        : null;
    const releaseSummary = normalizeUpdateText(entity.attributes?.release_summary);
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
    candidate.releaseSummary = releaseSummary;
    candidate.releaseNotes = releaseNotes;
    candidate.detailsUrl = detailsUrl;
    candidate.progress =
      typeof rawProgress === 'number' && !Number.isNaN(rawProgress)
        ? Math.max(0, Math.min(100, Math.round(rawProgress)))
        : null;
    candidate.requiresRestart = detectRestartRequired(releaseSummary, releaseNotes);

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

export function useProviderUpdateCandidates(enabled = true): PlatformUpdateNotificationCandidate[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = enabled && currentProviderId === 'home_assistant';
  const entities = useProviderEntitySnapshots({ enabled: isHomeAssistantProvider });
  const updateEntities = isHomeAssistantProvider
    ? selectProviderUpdateEntities(entities)
    : selectNoUpdateEntities();

  if (!isHomeAssistantProvider) {
    return [];
  }

  return mapHomeAssistantUpdateCandidates(updateEntities);
}
