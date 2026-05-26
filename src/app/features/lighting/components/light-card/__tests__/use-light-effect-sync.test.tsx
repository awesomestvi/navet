import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { lightEntityFactory } from '@/test/fixtures/home-assistant/entities/light';
import { renderHookWithProviders } from '@/test/render';
import { LIGHT_EFFECT_NONE } from '../light-card-effect-utils';
import { useLightEffectSync } from '../use-light-effect-sync';

function makeEntity(effectList?: unknown, effect?: unknown) {
  const entity = lightEntityFactory({
    effect_list: effectList,
    effect,
  });
  entity.entity_id = 'light.wled';
  entity.state = 'on';
  return entity as never;
}

describe('useLightEffectSync', () => {
  it('exposes normalized options and the current effect', () => {
    const syncLight = vi.fn().mockResolvedValue(undefined);
    const setIsOn = vi.fn();

    const { result } = renderHookWithProviders(() =>
      useLightEffectSync({
        isHomeAssistantLight: true,
        isOn: true,
        liveEntity: makeEntity(['Rainbow', 'Fire'], 'Rainbow'),
        setIsOn,
        syncLight,
      })
    );

    expect(result.current.supportsEffects).toBe(true);
    expect(result.current.currentEffect).toBe('Rainbow');
    expect(result.current.effectOptions.map((option) => option.label)).toEqual([
      'No effect',
      'Rainbow',
      'Fire',
    ]);
  });

  it('maps the synthetic no-effect option to EFFECT_OFF and reverts on failure', async () => {
    const syncLight = vi.fn().mockRejectedValue(new Error('boom'));
    const setIsOn = vi.fn();

    const { result } = renderHookWithProviders(() =>
      useLightEffectSync({
        isHomeAssistantLight: true,
        isOn: true,
        liveEntity: makeEntity(['Rainbow'], 'Rainbow'),
        setIsOn,
        syncLight,
      })
    );

    act(() => {
      result.current.onEffectSelect(LIGHT_EFFECT_NONE);
    });

    expect(syncLight).toHaveBeenCalledWith({ state: 'on', effect: 'EFFECT_OFF' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.currentEffect).toBe('Rainbow');
  });
});
