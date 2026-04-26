import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { useLightCardDisplay } from '../use-light-card-display';

function makeEntity(attributes: Record<string, unknown>) {
  return {
    entity_id: 'light.kitchen',
    state: 'on',
    attributes,
  } as never;
}

describe('useLightCardDisplay', () => {
  it('derives color support and temperature options from the entity', () => {
    const { result } = renderHookWithProviders(() =>
      useLightCardDisplay({
        selectedIcon: '',
        size: 'small',
        liveEntity: makeEntity({
          supported_color_modes: ['color_temp', 'hs'],
          min_color_temp_kelvin: 2800,
          max_color_temp_kelvin: 5100,
        }),
      })
    );

    expect(result.current.supportsColorTemperature).toBe(true);
    expect(result.current.supportsColorControl).toBe(true);
    expect(result.current.minColorTemp).toBe(2800);
    expect(result.current.maxColorTemp).toBe(5100);
    expect(result.current.tempOptions.every((option) => option.value >= 2800)).toBe(true);
  });

  it('uses emoji text when the selected icon is not a known component', () => {
    const { result } = renderHookWithProviders(() =>
      useLightCardDisplay({
        selectedIcon: '💡',
        size: 'small',
        liveEntity: undefined,
      })
    );

    expect(result.current.iconText).toBe('💡');
    expect(result.current.IconComponent).toBeNull();
  });

  it('marks extra-small cards as small', () => {
    const { result } = renderHookWithProviders(() =>
      useLightCardDisplay({
        selectedIcon: '',
        size: 'extra-small',
        liveEntity: undefined,
      })
    );

    expect(result.current.isSmall).toBe(true);
  });
});
