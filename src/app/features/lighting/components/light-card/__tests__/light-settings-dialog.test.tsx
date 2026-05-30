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
        supportsBrightness
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

  it('hides brightness controls and presets for on-off only lights', () => {
    renderWithProviders(
      <LightSettingsDialog
        entityId="light.porch"
        isOpen
        onOpenChange={vi.fn()}
        name="Porch Light"
        isOn
        supportsBrightness={false}
        supportsColorTemperature={false}
        supportsColorControl={false}
        supportsEffects={false}
        minColorTemp={2700}
        maxColorTemp={6500}
        tempOptions={[]}
        brightnessPresets={[]}
        currentEffect={null}
        effectOptions={[]}
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
        onEffectSelect={vi.fn()}
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

    expect(screen.queryByText('Presets')).not.toBeInTheDocument();
    expect(screen.queryByText('Brightness Presets')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Brightness' })).not.toBeInTheDocument();
  });
});
