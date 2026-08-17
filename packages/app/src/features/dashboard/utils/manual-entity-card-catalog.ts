import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { getDeviceTypeLabel } from '@navet/app/constants/device-type-labels';
import type { TranslateFn } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { getProviderEntityTypeLabel } from '@navet/app/utils/provider-entity-label';
import type { DashboardEntityView } from '@navet/ui/dashboard-entity-view';
import { Box } from 'lucide-react';
import type { DashboardLibraryCard } from '../components/dashboard-library-list';
import type { CustomCard } from '../stores/custom-cards-store';

interface BuildManualEntityCardCatalogParams {
  customCards: CustomCard[];
  deviceMap: Map<string, DeviceWithType>;
  entityViewsByCanonicalId: Record<string, DashboardEntityView>;
  placedCardIds: Set<string>;
  t: TranslateFn;
}

function formatEntityType(type: string) {
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveEntityType(type: string, ...entityIds: Array<string | undefined>) {
  if (type !== 'unknown') {
    return type;
  }

  for (const entityId of entityIds) {
    if (!entityId) {
      continue;
    }

    const nativeId = entityId.includes(':')
      ? entityId.slice(entityId.lastIndexOf(':') + 1)
      : entityId;
    if (nativeId.includes('.')) {
      return nativeId.slice(0, nativeId.indexOf('.'));
    }
  }

  return type;
}

function getCustomEntityIds(customCards: CustomCard[], placedCardIds: Set<string>) {
  const entityIds = new Set<string>();

  for (const card of customCards) {
    if (card.type !== 'entity' || !placedCardIds.has(card.id)) {
      continue;
    }

    const entityId = card.data?.entityId;
    if (typeof entityId === 'string' && entityId.length > 0) {
      entityIds.add(entityId);
    }
  }

  return entityIds;
}

function buildSearchText(parts: Array<string | undefined>) {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');
}

export function buildManualEntityCardCatalog({
  customCards,
  deviceMap,
  entityViewsByCanonicalId,
  placedCardIds,
  t,
}: BuildManualEntityCardCatalogParams): DashboardLibraryCard[] {
  const cards: DashboardLibraryCard[] = [];
  const addedEntityIds = new Set<string>();
  const placedCustomEntityIds = getCustomEntityIds(customCards, placedCardIds);
  const providerCount = new Set(
    Object.values(entityViewsByCanonicalId).map((entity) => entity.providerId)
  ).size;

  for (const device of deviceMap.values()) {
    if (placedCardIds.has(device.id) || placedCustomEntityIds.has(device.id)) {
      continue;
    }

    const entityView = entityViewsByCanonicalId[device.canonicalId ?? device.id];
    const title = typeof device.name === 'string' ? device.name : device.id;
    const room = getDeviceRoomLabel(device);
    const typeLabel =
      ('entityType' in device && typeof device.entityType === 'string' && device.entityType) ||
      getDeviceTypeLabel(device.type, t);
    const providerTypeLabel =
      getProviderEntityTypeLabel(device.id, typeLabel, providerCount > 1) ?? typeLabel;
    const entityType = resolveEntityType(
      entityView?.type ?? 'unknown',
      entityView?.externalId,
      device.nativeId,
      device.id
    );

    cards.push({
      id: device.id,
      title,
      subtitle: room,
      room,
      meta: providerTypeLabel,
      kind: 'device',
      entityType,
      entityTypeLabel: getDeviceTypeLabel(device.type, t),
      icon: getDeviceTypeIcon(
        device.type,
        'deviceClass' in device && typeof device.deviceClass === 'string'
          ? device.deviceClass
          : undefined
      ),
      idSearchText: buildSearchText([
        device.id,
        device.nativeId,
        device.canonicalId,
        entityView?.externalId,
      ]),
    });
    addedEntityIds.add(device.id);
    if (device.canonicalId) {
      addedEntityIds.add(device.canonicalId);
    }
    if (entityView?.id) {
      addedEntityIds.add(entityView.id);
    }
    if (entityView?.externalId) {
      addedEntityIds.add(entityView.externalId);
    }
  }

  for (const entity of Object.values(entityViewsByCanonicalId)) {
    if (
      placedCardIds.has(entity.canonicalId) ||
      placedCardIds.has(entity.id) ||
      placedCustomEntityIds.has(entity.canonicalId) ||
      placedCustomEntityIds.has(entity.id) ||
      placedCustomEntityIds.has(entity.externalId) ||
      addedEntityIds.has(entity.canonicalId) ||
      addedEntityIds.has(entity.id) ||
      addedEntityIds.has(entity.externalId)
    ) {
      continue;
    }

    const room = entity.room ?? 'Unknown';
    const entityType = resolveEntityType(entity.type, entity.externalId);
    const typeLabel = formatEntityType(entityType);
    cards.push({
      id: entity.canonicalId,
      title: entity.name,
      subtitle: room,
      room,
      meta: typeLabel,
      kind: 'device',
      entityType,
      entityTypeLabel: typeLabel,
      icon: entity.type === 'unknown' ? Box : getDeviceTypeIcon(entity.type),
      idSearchText: buildSearchText([entity.canonicalId, entity.id, entity.externalId]),
    });
  }

  return cards.sort(
    (left, right) =>
      (left.subtitle ?? '').localeCompare(right.subtitle ?? '') ||
      (left.meta ?? '').localeCompare(right.meta ?? '') ||
      (left.title ?? '').localeCompare(right.title ?? '')
  );
}
