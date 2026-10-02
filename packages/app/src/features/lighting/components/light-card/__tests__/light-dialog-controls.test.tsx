import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { Sun } from 'lucide-react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LightDialogControls } from '../light-dialog-controls';

function controls(overrides: Partial<ComponentProps<typeof LightDialogControls>> = {}) {
  const props: ComponentProps<typeof LightDialogControls> = {
    isOn: true,
    onPowerChange: vi.fn(),
    supportsBrightness: true,
    brightness: 62,
    brightnessPresets: [{ key: 'bright', label: 'Bright', brightness: 100, icon: Sun }],
    onBrightnessChange: vi.fn(),
    onBrightnessCommit: vi.fn(),
    supportsColorTemperature: true,
    colorTemp: 3500,
    minColorTemp: 2200,
    maxColorTemp: 6400,
    tempOptions: [{ value: 2700, color: '#ffe0aa', label: 'Cozy' }],
    onTempChange: vi.fn(),
    onTempCommit: vi.fn(),
    supportsColorControl: true,
    selectedColor: null,
    customColor: '#ff8800',
    onColorChange: vi.fn(),
    onCustomColorChange: vi.fn(),
    supportsEffects: false,
    currentEffect: null,
    effectOptions: [],
    onEffectSelect: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<LightDialogControls {...props} />);
  return props;
}

describe('LightDialogControls', () => {
  it('commits brightness shortcuts and toggles power through their independent commands', () => {
    const props = controls();
    fireEvent.click(screen.getByRole('checkbox', { name: /Bright\s*100%/ }));
    expect(props.onBrightnessCommit).toHaveBeenCalledWith(100);
    expect(props.onBrightnessChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(props.onPowerChange).toHaveBeenCalledWith(false);
  });

  it('switches between supported controls without changing the light until a value is selected', () => {
    const props = controls();
    expect(screen.getByRole('slider', { name: 'Color Temperature' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Colors' }));
    expect(screen.queryByRole('slider', { name: 'Color Temperature' })).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
    expect(props.onColorChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Select color #FFA500' }));
    expect(props.onColorChange).toHaveBeenCalledWith('#FFA500');
    fireEvent.click(screen.getByRole('tab', { name: 'Warmth' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cozy (2700K)' }));
    expect(props.onTempChange).toHaveBeenCalledWith(2700);
    expect(props.onTempCommit).toHaveBeenCalledWith(2700);
  });

  it('applies the new hue when a keyboard step commits', () => {
    const props = controls();
    fireEvent.click(screen.getByRole('tab', { name: 'Colors' }));
    const hue = screen.getByRole('slider', { name: 'Hue' });
    fireEvent.keyDown(hue, { key: 'ArrowRight' });

    expect(props.onCustomColorChange).toHaveBeenCalledTimes(1);
    expect(props.onCustomColorChange).not.toHaveBeenCalledWith('#ff8800');
    expect(props.onCustomColorChange).toHaveBeenCalledWith(expect.stringMatching(/^#[0-9a-f]{6}$/));
  });

  it('keeps power available while disabling value changes when off', () => {
    const props = controls({ isOn: false });
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveAttribute('data-disabled');
    expect(screen.getByRole('checkbox', { name: /Bright\s*100%/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Colors' }));
    expect(screen.getByRole('button', { name: 'Select color #FFA500' })).toBeDisabled();
    expect(
      screen.getByRole('slider', { name: 'Hue', hidden: true }).closest('[inert]')
    ).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(props.onPowerChange).toHaveBeenCalledWith(true);
  });
});
