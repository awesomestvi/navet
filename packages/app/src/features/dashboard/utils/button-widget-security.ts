const SERVICE_CALL_PATTERN = /^([a-z][a-z0-9_]*?)\.([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*)$/;
const ENTITY_ID_PATTERN = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;

export function parseButtonServiceCall(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = SERVICE_CALL_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, domain, service] = match;
  return domain && service ? { domain, service } : null;
}

export function sanitizeButtonEntityId(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return ENTITY_ID_PATTERN.test(trimmed) ? trimmed : undefined;
}
