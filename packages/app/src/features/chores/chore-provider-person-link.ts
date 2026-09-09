import type { PersonDevice } from '@navet/app/types/device.types';
import type { IntegrationUser } from '@navet/app/types/integration-user';

function normalizePersonName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function getProviderPersonLinkId(person: PersonDevice) {
  return person.nativeId?.trim() || person.id;
}

export function resolveProviderAccountLinkId(
  displayName: string,
  currentUser: IntegrationUser | null,
  existingLinkId?: string
) {
  const existing = existingLinkId?.trim();
  if (existing) return existing;

  return normalizePersonName(displayName) === normalizePersonName(currentUser?.name)
    ? currentUser?.id?.trim() || undefined
    : undefined;
}

export function resolveMatchingProviderPersonLinkId(
  displayName: string,
  providerPersons: PersonDevice[]
) {
  const normalizedDisplayName = normalizePersonName(displayName);
  if (!normalizedDisplayName) return undefined;

  const matches = providerPersons.filter(
    (person) => normalizePersonName(person.name) === normalizedDisplayName
  );

  return matches.length === 1 && matches[0] ? getProviderPersonLinkId(matches[0]) : undefined;
}
