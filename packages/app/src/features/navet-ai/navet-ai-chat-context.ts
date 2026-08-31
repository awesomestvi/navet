import { integrationStore } from '@navet/app/stores/integration-store';
import type { IntelligenceEntityReference } from '@navet/core/intelligence-chat';
import type { NavetEntity } from '@navet/core/types';

function safeText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

function toReference(entity: NavetEntity): IntelligenceEntityReference | null {
  if (entity.availability !== 'available') return null;
  if (entity.type !== 'light' && entity.type !== 'switch') return null;
  const name = safeText(entity.name);
  if (!name) return null;
  const primaryState = String(entity.primaryState).toLocaleLowerCase('en');

  return {
    id: entity.canonicalId,
    providerId: entity.providerId,
    name,
    room: safeText(entity.room),
    type: entity.type,
    state: primaryState === 'on' || primaryState === 'off' ? primaryState : 'unknown',
  };
}

export function buildNavetAiChatContext(
  entities: Record<string, NavetEntity> = integrationStore.getState().providerEntitiesByCanonicalId
) {
  return Object.values(entities)
    .flatMap((entity) => {
      const reference = toReference(entity);
      return reference ? [reference] : [];
    })
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, 120);
}
