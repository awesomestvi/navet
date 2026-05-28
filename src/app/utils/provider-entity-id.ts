import type { IntegrationProviderId } from '@/app/types/provider';
import { createProviderScopedId, parseProviderScopedId } from './provider-ids';

const LEGACY_HOME_ASSISTANT_ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+(?:[a-z0-9_/-]*)?$/i;

export function isLegacyHomeAssistantEntityId(value: string): boolean {
  return LEGACY_HOME_ASSISTANT_ENTITY_ID_PATTERN.test(value);
}

export function ensureCanonicalEntityId(
  value: string,
  defaultProviderId: IntegrationProviderId = 'home_assistant'
): string {
  if (!value) {
    return value;
  }

  if (parseProviderScopedId(value)) {
    return value;
  }

  if (isLegacyHomeAssistantEntityId(value)) {
    return createProviderScopedId(defaultProviderId, value);
  }

  return value;
}

export function ensureCanonicalEntityIds(
  values: string[],
  defaultProviderId: IntegrationProviderId = 'home_assistant'
): string[] {
  return Array.from(
    new Set(values.map((value) => ensureCanonicalEntityId(value, defaultProviderId)))
  );
}

export function normalizePersistedEntityRecord<T>(
  value: Record<string, T>,
  defaultProviderId: IntegrationProviderId = 'home_assistant'
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).map(([id, entry]) => [
      ensureCanonicalEntityId(id, defaultProviderId),
      entry,
    ])
  );
}
