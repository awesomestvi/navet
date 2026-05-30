import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
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
});
