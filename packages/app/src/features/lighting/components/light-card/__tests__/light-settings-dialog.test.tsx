import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
        onPowerChange={vi.fn()}
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

    fireEvent.click(screen.getByRole('checkbox', { name: 'Fire' }));

    expect(onEffectSelect).toHaveBeenCalledWith('Fire');
  });

  it('hides brightness controls and presets for on-off only lights and exposes card hiding', () => {
    const onRemoveCard = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <LightSettingsDialog
        entityId="light.porch"
        isOpen
        onOpenChange={onOpenChange}
        onRemoveCard={onRemoveCard}
        name="Porch Light"
        isOn={false}
        onPowerChange={vi.fn()}
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
    expect(screen.getByRole('button', { name: 'Done' })).toHaveStyle({
      backgroundColor: 'rgba(107, 114, 128, 0.14)',
      borderColor: 'rgba(107, 114, 128, 0.24)',
    });
    expect(screen.queryByRole('combobox', { name: 'Room' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getAllByRole('button', { name: 'More actions' })[0], { key: 'Enter' });
    const hideAction = screen.getByRole('menuitem', { name: 'Hide' });
    expect(hideAction).toHaveAttribute('data-variant', 'destructive');
    fireEvent.click(hideAction);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onRemoveCard).toHaveBeenCalledTimes(1);
  });
});
