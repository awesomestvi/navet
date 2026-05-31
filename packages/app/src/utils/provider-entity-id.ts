import type { IntegrationProviderId } from '@navet/app/types/provider';
import { createProviderScopedId, parseProviderScopedId } from './provider-ids';

const LEGACY_HOME_ASSISTANT_ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+(?:[a-z0-9_/-]*)?$/i;
const LEGACY_HOME_ASSISTANT_PROVIDER_ID: IntegrationProviderId = 'home_assistant';

export function isLegacyHomeAssistantEntityId(value: string): boolean {
  return LEGACY_HOME_ASSISTANT_ENTITY_ID_PATTERN.test(value);
}

export function resolveHomeAssistantEntityId(
  value: string,
  providerId?: IntegrationProviderId | null
): string | null {
  if (!value) {
    return null;
  }

  const scopedId = parseProviderScopedId(value);
  if (scopedId) {
    return scopedId.providerId === LEGACY_HOME_ASSISTANT_PROVIDER_ID ? scopedId.nativeId : null;
  }

  if (providerId === LEGACY_HOME_ASSISTANT_PROVIDER_ID) {
    return value;
  }

  return isLegacyHomeAssistantEntityId(value) ? value : null;
}

export function ensureCanonicalEntityId(
  value: string,
  legacyDefaultProviderId: IntegrationProviderId = LEGACY_HOME_ASSISTANT_PROVIDER_ID
): string {
  if (!value) {
    return value;
  }

  if (parseProviderScopedId(value)) {
    return value;
  }

  if (isLegacyHomeAssistantEntityId(value)) {
    // Legacy compatibility only. Shared app state should prefer canonical/provider-scoped ids
    // before values reach this helper.
    return createProviderScopedId(legacyDefaultProviderId, value);
  }

  return value;
}

export function ensureCanonicalEntityIds(
  values: string[],
  legacyDefaultProviderId: IntegrationProviderId = LEGACY_HOME_ASSISTANT_PROVIDER_ID
): string[] {
  return Array.from(
    new Set(values.map((value) => ensureCanonicalEntityId(value, legacyDefaultProviderId)))
  );
}

export function normalizePersistedEntityRecord<T>(
  value: Record<string, T>,
  legacyDefaultProviderId: IntegrationProviderId = LEGACY_HOME_ASSISTANT_PROVIDER_ID
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).map(([id, entry]) => [
      ensureCanonicalEntityId(id, legacyDefaultProviderId),
      entry,
    ])
  );
}
