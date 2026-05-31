export function getEntityTypeLabel(entityId?: string) {
  if (!entityId) {
    return '';
  }

  const separatorIndex = entityId.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === entityId.length - 1) {
    return '';
  }

  const domain = entityId.slice(0, separatorIndex).trim();
  if (!domain) {
    return '';
  }

  return domain
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
