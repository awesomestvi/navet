import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LightCardActionRow } from '../light-card-action-row';

describe('LightCardActionRow', () => {
  it('waits for a selected color before activating color mode', () => {
    const onColorActivate = vi.fn();
    const onColorChange = vi.fn();
    const { container } = renderWithProviders(
      <LightCardActionRow
        size="small"
        isOn
        currentColor="#00ff00"
        colorSwatchColor="#ff8800"
        currentTempColor="#ffffff"
        isKelvinMode={false}
        isColorMode={false}
        supportsBrightness
        supportsColorTemperature={false}
        supportsColorControl
        supportsEffects={false}
        brightnessPresets={[]}
        effectOptions={[]}
        brightness={50}
        currentEffect={null}
        onKelvinToggle={vi.fn()}
        onColorActivate={onColorActivate}
        onColorChange={onColorChange}
        onEffectSelect={vi.fn()}
        onBrightnessCommit={vi.fn()}
        showSettingsButton={false}
        settingsButtonProps={{ 'aria-label': 'Settings', onClick: vi.fn() }}
        presetOverflow="hide"
      />
    );

    const colorButton = screen.getByRole('button', { name: 'Choose custom color' });
    expect(colorButton).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.lucide-palette')).not.toBeNull();
    const colorInput = container.querySelector('input[type="color"]');
    expect(colorInput).not.toBeNull();

    fireEvent.click(colorButton);
    expect(colorButton).toHaveAttribute('aria-pressed', 'true');
    expect(colorButton.querySelector('[style*="255, 136, 0"]')).not.toBeNull();
    expect(onColorActivate).not.toHaveBeenCalled();
    expect(onColorChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(document.body);
    expect(colorButton).toHaveAttribute('aria-pressed', 'false');
    expect(colorButton.querySelector('[style*="255, 136, 0"]')).toBeNull();

    fireEvent.click(colorButton);
    fireEvent.change(colorInput as HTMLInputElement, {
      target: { value: '#00ff00' },
    });
    expect(onColorActivate).toHaveBeenCalledTimes(1);
    expect(onColorChange).toHaveBeenCalledWith('#00ff00');
  });

  it('keeps the bottom settings button neutral in dark theme', () => {
    renderWithProviders(
      <LightCardActionRow
        size="small"
        isOn
        currentColor="#ff8800"
        colorSwatchColor="#ff8800"
        currentTempColor="#ffffff"
        activeColor="#ff8800"
        isKelvinMode={false}
        isColorMode={true}
        supportsBrightness={false}
        supportsColorTemperature={false}
        supportsColorControl
        supportsEffects={false}
        brightnessPresets={[]}
        effectOptions={[]}
        brightness={50}
        currentEffect={null}
        onKelvinToggle={vi.fn()}
        onColorActivate={vi.fn()}
        onColorChange={vi.fn()}
        onEffectSelect={vi.fn()}
        onBrightnessCommit={vi.fn()}
        showSettingsButton
        settingsButtonProps={{ 'aria-label': 'Settings', onClick: vi.fn() }}
        presetOverflow="hide"
      />
    );

    const settingsButton = screen.getByLabelText('Settings');
    const selectedColorButton = screen.getByRole('button', { name: 'Choose custom color' });
    expect(selectedColorButton.style.background).toContain('conic-gradient');
    expect(selectedColorButton).toHaveClass('!border-0', '!shadow-none', 'backdrop-blur-none');
    expect(selectedColorButton.style.boxShadow).toBe('none');
    expect(selectedColorButton.style.backdropFilter).toBe('none');
    expect(selectedColorButton.querySelector('.lucide-palette')).not.toBeNull();
    expect(settingsButton).toBeInTheDocument();
    expect(settingsButton.getAttribute('style') ?? '').not.toContain('255, 136, 0');
    expect(settingsButton.querySelector('[style*="255, 136, 0"]')).toBeNull();
  });

  it('returns the effects button to rest when the menu closes without a selection', async () => {
    const onEffectSelect = vi.fn();
    renderWithProviders(
      <LightCardActionRow
        size="small"
        isOn
        currentColor=""
        colorSwatchColor="#ff8800"
        currentTempColor="#ffffff"
        activeColor="#ff8800"
        isKelvinMode={false}
        isColorMode={false}
        supportsBrightness={false}
        supportsColorTemperature={false}
        supportsColorControl={false}
        supportsEffects
        brightnessPresets={[]}
        effectOptions={[
          { value: '__navet_no_effect__', label: 'No effect', isOff: true },
          { value: 'Rainbow', label: 'Rainbow', isOff: false },
        ]}
        brightness={50}
        currentEffect={null}
        onKelvinToggle={vi.fn()}
        onColorActivate={vi.fn()}
        onColorChange={vi.fn()}
        onEffectSelect={onEffectSelect}
        onBrightnessCommit={vi.fn()}
        showSettingsButton={false}
        settingsButtonProps={{ 'aria-label': 'Settings', onClick: vi.fn() }}
        presetOverflow="hide"
      />
    );

    const effectButton = screen.getByRole('button', { name: 'Choose light effect' });
    expect(effectButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.pointerDown(effectButton);

    expect(effectButton).toHaveAttribute('aria-pressed', 'true');
    expect(effectButton.querySelector('[style*="255, 136, 0"]')).not.toBeNull();
    expect(onEffectSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    await waitFor(() => expect(effectButton).toHaveAttribute('aria-pressed', 'false'));
    expect(effectButton.querySelector('[style*="255, 136, 0"]')).toBeNull();
    expect(effectButton).not.toHaveClass('navet-light-effect-beam');
    expect(onEffectSelect).not.toHaveBeenCalled();
  });

  it('keeps the effects button selected while an effect is active', () => {
    renderWithProviders(
      <LightCardActionRow
        size="small"
        isOn
        currentColor=""
        colorSwatchColor="#ff8800"
        currentTempColor="#ffffff"
        activeColor="#ff8800"
        isKelvinMode={false}
        isColorMode={false}
        supportsBrightness={false}
        supportsColorTemperature={false}
        supportsColorControl={false}
        supportsEffects
        brightnessPresets={[]}
        effectOptions={[
          { value: '__navet_no_effect__', label: 'No effect', isOff: true },
          { value: 'Rainbow', label: 'Rainbow', isOff: false },
        ]}
        brightness={50}
        currentEffect="Rainbow"
        onKelvinToggle={vi.fn()}
        onColorActivate={vi.fn()}
        onColorChange={vi.fn()}
        onEffectSelect={vi.fn()}
        onBrightnessCommit={vi.fn()}
        showSettingsButton={false}
        settingsButtonProps={{ 'aria-label': 'Settings', onClick: vi.fn() }}
        presetOverflow="hide"
      />
    );

    const effectButton = screen.getByRole('button', { name: 'Choose light effect' });
    expect(effectButton).toHaveAttribute('aria-pressed', 'true');
    expect(effectButton.querySelector('[style*="255, 136, 0"]')).not.toBeNull();
    expect(effectButton).toHaveClass('navet-light-effect-beam');
    expect(effectButton.style.getPropertyValue('--navet-light-effect-accent')).toBe('#ff8800');
  });

  it('hides the settings button when brightness presets are unavailable and no other quick controls remain', () => {
    renderWithProviders(
      <LightCardActionRow
        size="small"
        isOn
        currentColor="#ff8800"
        colorSwatchColor="#ff8800"
        currentTempColor="#ffffff"
        isKelvinMode={false}
        isColorMode={false}
        supportsBrightness={false}
        supportsColorTemperature={false}
        supportsColorControl={false}
        supportsEffects={false}
        brightnessPresets={[]}
        effectOptions={[]}
        brightness={50}
        currentEffect={null}
        onKelvinToggle={vi.fn()}
        onColorActivate={vi.fn()}
        onColorChange={vi.fn()}
        onEffectSelect={vi.fn()}
        onBrightnessCommit={vi.fn()}
        showSettingsButton
        settingsButtonProps={{ 'aria-label': 'Settings', onClick: vi.fn() }}
        presetOverflow="hide"
      />
    );

    expect(screen.queryByLabelText('Settings')).not.toBeInTheDocument();
  });
});
