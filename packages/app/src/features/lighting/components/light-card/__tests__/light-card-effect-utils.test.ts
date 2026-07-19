import { describe, expect, it } from 'vitest';
import {
  buildLightEffectOptions,
  formatLightEffectLabel,
  getSelectedLightEffectOptionValue,
  isColorCyclingLightEffect,
  LIGHT_EFFECT_NONE,
  normalizeCurrentLightEffect,
  supportsLightEffects,
  toHomeAssistantLightEffectValue,
} from '../light-card-effect-utils';

function makeEntity(effectList?: unknown, effect?: unknown) {
  return {
    entity_id: 'light.wled',
    state: 'on',
    attributes: {
      effect_list: effectList,
      effect,
    },
  } as never;
}

describe('light-card effect utils', () => {
  it('detects effect support from effect_list and preserves Home Assistant ordering', () => {
    const entity = makeEntity(['Rainbow', 'Fire', 'Twinkle']);

    expect(supportsLightEffects(entity)).toBe(true);
    expect(buildLightEffectOptions(entity, 'No effect').map((option) => option.label)).toEqual([
      'No effect',
      'Rainbow',
      'Fire',
      'Twinkle',
    ]);
  });

  it('normalizes effect off and empty values to no active effect', () => {
    expect(normalizeCurrentLightEffect('EFFECT_OFF')).toBeNull();
    expect(normalizeCurrentLightEffect('off')).toBeNull();
    expect(normalizeCurrentLightEffect('Off')).toBeNull();
    expect(normalizeCurrentLightEffect(LIGHT_EFFECT_NONE)).toBeNull();
    expect(normalizeCurrentLightEffect('')).toBeNull();
    expect(normalizeCurrentLightEffect(undefined)).toBeNull();
    expect(getSelectedLightEffectOptionValue(null)).toBe(LIGHT_EFFECT_NONE);
    expect(toHomeAssistantLightEffectValue(LIGHT_EFFECT_NONE)).toBe('off');
  });

  it('recognizes color-cycling effects without classifying warm effects as rainbow', () => {
    expect(isColorCyclingLightEffect('Prism')).toBe(true);
    expect(isColorCyclingLightEffect('Color Loop')).toBe(true);
    expect(isColorCyclingLightEffect('Fire')).toBe(false);
    expect(isColorCyclingLightEffect(null)).toBe(false);
  });

  it('capitalizes effect labels without changing their command values', () => {
    const options = buildLightEffectOptions(makeEntity(['prism', 'fire']), 'No effect');

    expect(options).toEqual([
      { isOff: true, label: 'No effect', value: LIGHT_EFFECT_NONE },
      { isOff: false, label: 'Prism', value: 'prism' },
      { isOff: false, label: 'Fire', value: 'fire' },
    ]);
    expect(formatLightEffectLabel('  color loop')).toBe('Color loop');
  });

  it('keeps an active effect visible even if it is absent from the current effect_list', () => {
    const entity = makeEntity(['Fire'], 'Rainbow');

    expect(
      buildLightEffectOptions(entity, 'No effect', 'Rainbow').map((option) => option.label)
    ).toEqual(['No effect', 'Fire', 'Rainbow']);
  });
});
