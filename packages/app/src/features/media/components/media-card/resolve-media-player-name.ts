function readNonEmpty(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeLabel(value: string | null) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function isRawEntityId(value: string) {
  return /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(value.trim());
}

function humanizeObjectId(entityId: string) {
  const objectId = entityId.split('.').slice(1).join('.').trim();
  if (!objectId) {
    return null;
  }

  return objectId
    .split(/[._-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isGenericEntityType(entityType: string) {
  const normalized = normalizeLabel(entityType);
  return normalized === 'media player' || normalized === 'player';
}

export function resolveMediaPlayerName(options: {
  entityId: string;
  entityName: string;
  room?: string;
  entityType?: string;
}) {
  const entityName = readNonEmpty(options.entityName);
  if (entityName && !isRawEntityId(entityName)) {
    return entityName;
  }

  const room = readNonEmpty(options.room);
  const entityType = readNonEmpty(options.entityType);
  const humanizedObjectId = humanizeObjectId(options.entityId);

  if (
    room &&
    entityType &&
    !isGenericEntityType(entityType) &&
    normalizeLabel(humanizedObjectId) === normalizeLabel(room)
  ) {
    return `${room} ${entityType}`;
  }

  return humanizedObjectId ?? room ?? entityType ?? entityName ?? options.entityId;
}
