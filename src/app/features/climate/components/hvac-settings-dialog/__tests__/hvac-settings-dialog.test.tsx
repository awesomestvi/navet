import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/app/stores/settings-store';
import { renderWithProviders } from '@/test/render';
import { HVACSettingsDialog } from '../index';
import type { HVACSettingsDialogProps } from '../types';

function renderDialog(overrides: Partial<HVACSettingsDialogProps> = {}) {
  const props: HVACSettingsDialogProps = {
    entityId: 'climate.hallway',
    isOpen: true,
    onOpenChange: vi.fn(),
    name: 'Hallway',
    isOn: true,
    mode: 'heat',
    targetTemp: 72,
    currentTemp: 70,
    sourceTemperatureUnit: 'fahrenheit',
    minTemp: 60,
    maxTemp: 86,
    step: 1,
    supportedHvacModes: ['heat', 'cool', 'off'],
    onModeChange: vi.fn(),
    onTargetTempChange: vi.fn(),
    onTargetTempCommit: vi.fn(),
    ...overrides,
  };

  renderWithProviders(<HVACSettingsDialog {...props} />);
  return props;
}

describe('HVACSettingsDialog', () => {
  beforeEach(() => {
    useSettingsStore.setState({ temperatureUnit: 'fahrenheit' });
  });

  it('keeps Fahrenheit source temperatures unchanged when Navet display is Fahrenheit', () => {
    const props = renderDialog();

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '72');
    expect(screen.getByText('70°F')).toBeInTheDocument();
    expect(screen.queryByText('162')).not.toBeInTheDocument();
    expect(screen.queryByText('Current 158°F')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Increase temperature'));

    expect(props.onTargetTempCommit).toHaveBeenCalledWith(73);
  });

  it('renders Celsius comfort presets as Fahrenheit display values and commits Fahrenheit source values', () => {
    const props = renderDialog();

    expect(screen.queryByRole('button', { name: '18°' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '21°' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '24°' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '64°' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '70°' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '75°' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '70°' }));

    expect(props.onTargetTempCommit).toHaveBeenCalledWith(expect.closeTo(69.8));
  });

  it('converts Fahrenheit source temperatures when Navet display is Celsius', () => {
    useSettingsStore.setState({ temperatureUnit: 'celsius' });
    const props = renderDialog();

    expect(Number(screen.getByRole('slider').getAttribute('aria-valuenow'))).toBeCloseTo(22.222);
    expect(screen.getByText('21.1°C')).toBeInTheDocument();
    expect(screen.queryByText('70°F')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Increase temperature'));

    expect(props.onTargetTempCommit).toHaveBeenCalledWith(expect.closeTo(73));
  });

  it('keeps Celsius source temperatures unchanged when Navet display is Celsius', () => {
    useSettingsStore.setState({ temperatureUnit: 'celsius' });
    const props = renderDialog({
      targetTemp: 22,
      currentTemp: 21,
      sourceTemperatureUnit: 'celsius',
      minTemp: 16,
      maxTemp: 30,
      step: 0.5,
    });

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '22');
    expect(screen.getByText('21°C')).toBeInTheDocument();
    expect(screen.queryByText('69.8°F')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Increase temperature'));

    expect(props.onTargetTempCommit).toHaveBeenCalledWith(22.5);
  });

  it('converts Celsius source temperatures when Navet display is Fahrenheit', () => {
    const props = renderDialog({
      targetTemp: 22,
      currentTemp: 21,
      sourceTemperatureUnit: 'celsius',
      minTemp: 16,
      maxTemp: 30,
      step: 0.5,
    });

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '71.6');
    expect(screen.getByText('69.8°F')).toBeInTheDocument();
    expect(screen.queryByText('21°C')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Increase temperature'));

    expect(props.onTargetTempCommit).toHaveBeenCalledWith(expect.closeTo(22.5));
  });
});
