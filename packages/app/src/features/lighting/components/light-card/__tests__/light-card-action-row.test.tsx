import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LightCardActionRow } from '../light-card-action-row';

describe('LightCardActionRow', () => {
  it('keeps the custom color trigger active when the light is already in color mode', () => {
    const { container } = renderWithProviders(
      <LightCardActionRow
        size="small"
        isOn
        currentColor="#ff8800"
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
        onColorActivate={vi.fn()}
        onColorChange={vi.fn()}
        onEffectSelect={vi.fn()}
        onBrightnessCommit={vi.fn()}
        showSettingsButton={false}
        settingsButtonProps={{ 'aria-label': 'Settings', onClick: vi.fn() }}
        presetOverflow="hide"
      />
    );

    expect(screen.getAllByLabelText('Choose custom color')).toHaveLength(2);
    expect(container.querySelector('label[style*="conic-gradient"]')).not.toBeNull();
  });

  it('keeps the bottom settings button neutral in dark theme', () => {
    const { container } = renderWithProviders(
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
    expect(settingsButton).toBeInTheDocument();
    expect(settingsButton.getAttribute('style') ?? '').not.toContain('255, 136, 0');
    expect(container.querySelector('[style*="255, 136, 0"]')).toBeNull();
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
