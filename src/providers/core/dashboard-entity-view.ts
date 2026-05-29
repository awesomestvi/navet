import type { NavetEntity } from './types';

export type DashboardEntityViewSize =
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
  | 'medium-vertical';

export interface DashboardEntityView {
  id: string;
  canonicalId: string;
  providerId: NavetEntity['providerId'];
  externalId: string;
  type: NavetEntity['type'];
  name: string;
  room?: string;
  primaryState: NavetEntity['primaryState'];
  availability: NavetEntity['availability'];
  capabilities: NavetEntity['capabilities'];
  attributes: NavetEntity['attributes'];
  resources: NavetEntity['resources'];
  size: DashboardEntityViewSize;
  lastUpdated?: string;
}

function readViewSize(value: unknown): DashboardEntityViewSize {
  return value === 'small' ||
    value === 'medium' ||
    value === 'large' ||
    value === 'extra-large' ||
    value === 'medium-vertical'
    ? value
    : 'small';
}

export function createDashboardEntityView(entity: NavetEntity): DashboardEntityView {
  return {
    id: entity.id,
    canonicalId: entity.canonicalId,
    providerId: entity.providerId,
    externalId: entity.externalId,
    type: entity.type,
    name: entity.name,
    room: entity.room,
    primaryState: entity.primaryState,
    availability: entity.availability,
    capabilities: entity.capabilities,
    attributes: entity.attributes,
    resources: entity.resources,
    size: readViewSize(entity.attributes.size),
    lastUpdated: entity.lastUpdated,
  };
}

export function indexDashboardEntityViewsByCanonicalId(
  entities: Iterable<NavetEntity>
): Record<string, DashboardEntityView> {
  const entityViewsByCanonicalId: Record<string, DashboardEntityView> = {};

  for (const entity of entities) {
    entityViewsByCanonicalId[entity.canonicalId] = createDashboardEntityView(entity);
  }

  return entityViewsByCanonicalId;
}
