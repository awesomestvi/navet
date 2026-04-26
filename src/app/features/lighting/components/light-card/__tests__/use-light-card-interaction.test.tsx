import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

const interactionMock = {
  interactionMode: 'toggle-first',
  iconButtonProps: { 'aria-label': 'toggle' },
  settingsButtonProps: { 'aria-label': 'settings' },
};

vi.mock('@/app/components/shared/entity-card-interaction-controller', () => ({
  useEntityCardInteractionController: vi.fn(
    (options: { onOpenControls: () => void; onOpenSettings: () => void }) => ({
      ...interactionMock,
      iconButtonProps: {
        ...interactionMock.iconButtonProps,
        onClick: vi.fn(),
      },
      settingsButtonProps: {
        ...interactionMock.settingsButtonProps,
        onClick: options.onOpenControls,
      },
    })
  ),
}));

import { useLightCardInteraction } from '../use-light-card-interaction';

describe('useLightCardInteraction', () => {
  it('shows the settings button outside control-first mode', () => {
    const { result } = renderHookWithProviders(() =>
      useLightCardInteraction({
        name: 'Kitchen Light',
        isOn: true,
        isEditMode: false,
        isSmall: false,
        toggleLightState: vi.fn(),
        setIsOpen: vi.fn(),
      })
    );

    expect(result.current.showSettingsButton).toBe(true);
    expect(result.current.showPresetOverflow).toBe(true);
  });

  it('shows the preset overflow on small cards', () => {
    interactionMock.interactionMode = 'control-first';

    const { result } = renderHookWithProviders(() =>
      useLightCardInteraction({
        name: 'Kitchen Light',
        isOn: true,
        isEditMode: false,
        isSmall: true,
        toggleLightState: vi.fn(),
        setIsOpen: vi.fn(),
      })
    );

    expect(result.current.showSettingsButton).toBe(false);
    expect(result.current.showPresetOverflow).toBe(true);
  });

  it('opens the dialog through the settings handler', () => {
    const setIsOpen = vi.fn();
    const { result } = renderHookWithProviders(() =>
      useLightCardInteraction({
        name: 'Kitchen Light',
        isOn: true,
        isEditMode: false,
        isSmall: false,
        toggleLightState: vi.fn(),
        setIsOpen,
      })
    );

    act(() =>
      result.current.cardInteraction.settingsButtonProps.onClick({
        stopPropagation: vi.fn(),
      } as never)
    );

    expect(setIsOpen).toHaveBeenCalledWith(true);
  });
});
