import { integrationStore } from '@navet/app/stores/integration-store';
import type { IntelligenceEntityReference } from '@navet/core/intelligence-chat';
import type { NavetEntity } from '@navet/core/types';

function safeText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

function numericReadingValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function temperatureUnit(value: unknown): '°C' | '°F' | 'K' | undefined {
  if (typeof value !== 'string') return undefined;
  switch (value.trim().toLocaleLowerCase('en')) {
    case 'c':
    case '°c':
    case 'celsius':
      return '°C';
    case 'f':
    case '°f':
    case 'fahrenheit':
      return '°F';
    case 'k':
    case 'kelvin':
      return 'K';
    default:
      return undefined;
  }
}

function toReference(entity: NavetEntity): IntelligenceEntityReference | null {
  if (entity.availability !== 'available') return null;
  const name = safeText(entity.name);
  if (!name) return null;

  if (entity.type === 'sensor' && entity.attributes.deviceClass === 'temperature') {
    const value = numericReadingValue(entity.primaryState ?? entity.attributes.value);
    const unit = temperatureUnit(entity.attributes.unit ?? entity.attributes.temperatureUnit);
    if (value === undefined || !unit) return null;
    return {
      id: entity.canonicalId,
      providerId: entity.providerId,
      name,
      room: safeText(entity.room),
      type: 'temperature',
      value,
      unit,
    };
  }

  if (entity.type === 'sensor' && entity.attributes.deviceClass === 'humidity') {
    const value = numericReadingValue(entity.primaryState ?? entity.attributes.value);
    if (value === undefined || entity.attributes.unit !== '%') return null;
    return {
      id: entity.canonicalId,
      providerId: entity.providerId,
      name,
      room: safeText(entity.room),
      type: 'humidity',
      value,
      unit: '%',
    };
  }

  if (entity.type === 'climate') {
    if (entity.attributes.hasCurrentTemperature === false) return null;
    const value = numericReadingValue(entity.attributes.currentTemperature);
    const unit = temperatureUnit(entity.attributes.temperatureUnit ?? entity.attributes.unit);
    if (value === undefined || !unit) return null;
    return {
      id: entity.canonicalId,
      providerId: entity.providerId,
      name,
      room: safeText(entity.room),
      type: 'temperature',
      value,
      unit,
    };
  }

  if (entity.type !== 'light' && entity.type !== 'switch') return null;
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
