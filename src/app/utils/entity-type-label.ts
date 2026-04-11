export function getEntityTypeLabel(entityId?: string) {
  if (!entityId) {
    return '';
  }

  const domain = entityId.split('.')[0] ?? '';
  if (!domain) {
    return '';
  }

  return domain
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
