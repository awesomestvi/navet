import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import type { LightEffectOption } from './light-card-types';

export const LIGHT_EFFECT_OFF = 'off';
export const LIGHT_EFFECT_NONE = '__navet_no_effect__';
const COLOR_CYCLING_EFFECT_PATTERN = /(?:prism|rainbow|colou?r[\s_-]*loop|spectrum|aurora)/i;

function normalizeEffectLabel(value: string): string {
  return value.trim();
}

export function formatLightEffectLabel(value: string): string {
  const normalized = normalizeEffectLabel(value);
  return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : normalized;
}

export function normalizeCurrentLightEffect(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === LIGHT_EFFECT_NONE ||
    trimmed.toLowerCase() === LIGHT_EFFECT_OFF ||
    trimmed === 'EFFECT_OFF'
  ) {
    return null;
  }

  return trimmed;
}

export function isColorCyclingLightEffect(value: string | null): boolean {
  return typeof value === 'string' && COLOR_CYCLING_EFFECT_PATTERN.test(value);
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
      label: formatLightEffectLabel(normalized),
      value: normalized,
    });
  }

  if (currentEffect && !seenEffects.has(currentEffect)) {
    options.push({
      isOff: false,
      label: formatLightEffectLabel(currentEffect),
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
