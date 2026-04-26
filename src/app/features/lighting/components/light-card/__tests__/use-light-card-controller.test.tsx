import { act } from '@testing-library/react';
import type { LucideIcon } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

const lightRuntimeState = {
  brightness: 70,
  colorTemp: 3200,
  customColor: '#ffffff',
  onBrightnessChange: vi.fn(),
  onBrightnessCommit: vi.fn(),
  onColorChange: vi.fn(),
  onCustomColorChange: vi.fn(),
  onTempChange: vi.fn(),
  onTempCommit: vi.fn(),
  selectedColor: '#ffeeaa',
  toggleLightState: vi.fn(),
};

vi.mock('@/app/hooks', () => ({
  useHomeAssistant: vi.fn(
    (
      selector: (state: { connection: object | null; entities: Record<string, unknown> }) => unknown
    ) =>
      selector({
        connection: {},
        entities: {
          'light.kitchen': { entity_id: 'light.kitchen', state: 'on', attributes: {} },
        },
      })
  ),
}));

vi.mock('../../hooks/use-brightness-presets', () => ({
  useBrightnessPresets: vi.fn(() => []),
}));

vi.mock('../../stores/light-memory-store', () => ({
  useLightMemoryStore: vi.fn(
    (selector: (state: { rememberState: (id: string, value: unknown) => void }) => unknown) =>
      selector({ rememberState: vi.fn() })
  ),
}));

vi.mock('../use-light-card-display', () => ({
  useLightCardDisplay: vi.fn(() => ({
    isSmall: false,
    padding: 'p-3',
    supportsColorTemperature: true,
    supportsColorControl: true,
    minColorTemp: 2700,
    maxColorTemp: 6500,
    tempOptions: [{ value: 2700, color: '#ffb366', label: 'Warm' }],
    IconComponent: Lightbulb as LucideIcon,
    iconText: null,
  })),
}));

vi.mock('../use-light-on-state-sync', () => ({
  useLightOnStateSync: vi.fn(),
}));

vi.mock('../use-light-runtime-state', () => ({
  useLightRuntimeState: vi.fn(() => lightRuntimeState),
}));

vi.mock('../use-light-preset-actions', () => ({
  useLightPresetActions: vi.fn(() => ({
    applyBrightnessPresetsToAll: true,
    setApplyBrightnessPresetsToAll: vi.fn(),
    onBrightnessPresetOrderChange: vi.fn(),
    onBrightnessPresetValueChange: vi.fn(),
  })),
}));

vi.mock('../use-light-card-interaction', () => ({
  useLightCardInteraction: vi.fn(() => ({
    cardInteraction: {
      iconButtonProps: { 'aria-label': 'toggle' },
      settingsButtonProps: { 'aria-label': 'settings' },
    },
    showPresetOverflow: true,
    showSettingsButton: true,
  })),
}));

import { useLightCardController } from '../use-light-card-controller';

describe('useLightCardController', () => {
  it('builds a composed controller state from its dependencies', () => {
    const { result } = renderHookWithProviders(() =>
      useLightCardController({
        id: 'light.kitchen',
        name: 'Kitchen',
        room: 'Kitchen',
        initialState: true,
        initialBrightness: 40,
        initialTemp: 3000,
        size: 'small',
        isEditMode: false,
      })
    );

    expect(result.current.brightness).toBe(70);
    expect(result.current.currentColor).toBe('#ffeeaa');
    expect(result.current.IconComponent).toBe(Lightbulb);
    expect(result.current.showSettingsButton).toBe(true);
  });

  it('trims icon values and updates local dialog state', () => {
    const { result } = renderHookWithProviders(() =>
      useLightCardController({
        id: 'light.kitchen',
        name: 'Kitchen',
        room: 'Kitchen',
        initialState: true,
        initialBrightness: 40,
        initialTemp: 3000,
        size: 'small',
        isEditMode: false,
      })
    );

    act(() => {
      result.current.onIconChange('  lamp  ');
      result.current.onOpenChange(true);
      result.current.onTintColorChange('#ffaa00');
    });

    expect(result.current.selectedIcon).toBe('lamp');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.tintColor).toBe('#ffaa00');
  });
});
