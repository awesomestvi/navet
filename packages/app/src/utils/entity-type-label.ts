import { parseProviderScopedId } from './provider-ids';

export function getEntityTypeLabel(entityId?: string) {
  if (!entityId) {
    return '';
  }

  const normalizedEntityId = parseProviderScopedId(entityId)?.nativeId ?? entityId;
  const separatorIndex = normalizedEntityId.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === normalizedEntityId.length - 1) {
    return '';
  }

  const domain = normalizedEntityId.slice(0, separatorIndex).trim();
  if (!domain) {
    return '';
  }

  return domain
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
