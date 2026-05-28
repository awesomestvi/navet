import type { PlatformEntitySnapshot } from '@/app/platform/provider-feature-models';
import type { LightEffectOption } from './light-card-types';

export const LIGHT_EFFECT_OFF = 'EFFECT_OFF';
export const LIGHT_EFFECT_NONE = '__navet_no_effect__';

function normalizeEffectLabel(value: string): string {
  return value.trim();
}

export function normalizeCurrentLightEffect(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === LIGHT_EFFECT_OFF) {
    return null;
  }

  return trimmed;
}

export function getLightEffectList(entity?: PlatformEntitySnapshot): string[] {
  const effectList = entity?.attributes?.effect_list;
  if (!Array.isArray(effectList)) {
    return [];
  }

  return effectList
    .filter((effect): effect is string => typeof effect === 'string')
    .map(normalizeEffectLabel)
    .filter(Boolean);
}

export function supportsLightEffects(entity?: PlatformEntitySnapshot): boolean {
  return getLightEffectList(entity).length > 0;
}

export function buildLightEffectOptions(
  entity: PlatformEntitySnapshot | undefined,
  noEffectLabel: string,
  currentEffect?: string | null
): LightEffectOption[] {
  const effects = getLightEffectList(entity);
  if (effects.length === 0) {
    return [];
  }

  const options: LightEffectOption[] = [
    {
      isOff: true,
      label: noEffectLabel,
      value: LIGHT_EFFECT_NONE,
    },
  ];
  const seenEffects = new Set<string>();

  for (const effect of effects) {
    const normalized = normalizeCurrentLightEffect(effect);
    if (!normalized || seenEffects.has(normalized)) {
      continue;
    }

    seenEffects.add(normalized);
    options.push({
      isOff: false,
      label: normalized,
      value: normalized,
    });
  }

  if (currentEffect && !seenEffects.has(currentEffect)) {
    options.push({
      isOff: false,
      label: currentEffect,
      value: currentEffect,
    });
  }

  return options;
}

export function getSelectedLightEffectOptionValue(currentEffect: string | null): string {
  return currentEffect ?? LIGHT_EFFECT_NONE;
}

export function toHomeAssistantLightEffectValue(effectValue: string): string {
  return effectValue === LIGHT_EFFECT_NONE ? LIGHT_EFFECT_OFF : effectValue;
}
