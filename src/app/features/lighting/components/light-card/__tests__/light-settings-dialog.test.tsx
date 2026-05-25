import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { LightSettingsDialog } from '../light-settings-dialog';

describe('LightSettingsDialog', () => {
  it('renders the current effect and allows selecting another effect', () => {
    const onEffectSelect = vi.fn();

    renderWithProviders(
      <LightSettingsDialog
        entityId="light.wled"
        isOpen
        onOpenChange={vi.fn()}
        name="Desk Lamp"
        isOn
        supportsColorTemperature={false}
        supportsColorControl={false}
        supportsEffects
        minColorTemp={2700}
        maxColorTemp={6500}
        tempOptions={[]}
        brightnessPresets={[]}
        currentEffect="Rainbow"
        effectOptions={[
          { isOff: true, label: 'No effect', value: '__navet_no_effect__' },
          { isOff: false, label: 'Rainbow', value: 'Rainbow' },
          { isOff: false, label: 'Fire', value: 'Fire' },
        ]}
        colorTemp={3200}
        selectedColor={null}
        customColor="#ffffff"
        brightness={70}
        selectedIcon=""
        tintColor=""
        onTempChange={vi.fn()}
        onTempCommit={vi.fn()}
        onColorChange={vi.fn()}
        onCustomColorChange={vi.fn()}
        onEffectSelect={onEffectSelect}
        onBrightnessChange={vi.fn()}
        onBrightnessCommit={vi.fn()}
        applyBrightnessPresetsToAll
        onApplyBrightnessPresetsToAllChange={vi.fn()}
        onBrightnessPresetValueChange={vi.fn()}
        onBrightnessPresetOrderChange={vi.fn()}
        onIconChange={vi.fn()}
        onTintColorChange={vi.fn()}
      />
    );

    expect(screen.getByText('Current effect: Rainbow')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Rainbow' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Fire' }));

    expect(onEffectSelect).toHaveBeenCalledWith('Fire');
  });
});
