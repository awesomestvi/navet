import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '@/app/i18n';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { EnergySetupWizard } from '..';

function renderWizard() {
  return render(
    <I18nProvider>
      <EnergySetupWizard onSave={() => {}} />
    </I18nProvider>
  );
}

function chooseOption(
  placeholder: string,
  searchText: string,
  optionLabel: string,
  entityId: string
) {
  const input = screen.getByPlaceholderText(placeholder);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: searchText } });
  const option = screen
    .getAllByRole('option')
    .find(
      (candidate) =>
        candidate.textContent?.includes(optionLabel) && candidate.textContent?.includes(entityId)
    );

  if (!option) {
    throw new Error(`Option ${optionLabel} (${entityId}) not found`);
  }

  fireEvent.click(option);
}

describe('EnergySetupWizard', () => {
  beforeEach(() => {
    useThemeStore.setState({
      ...useThemeStore.getState(),
      theme: 'dark',
      followSystemTheme: false,
      primaryColor: 'orange',
      customPrimaryColor: null,
      wallpaper: null,
    });

    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      connected: true,
      entities: {
        'sensor.home_load_power': {
          entity_id: 'sensor.home_load_power',
          state: '1260',
          attributes: {
            friendly_name: 'Home Load Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-1', parent_id: null, user_id: null },
        },
        'sensor.grid_import_power': {
          entity_id: 'sensor.grid_import_power',
          state: '870',
          attributes: {
            friendly_name: 'Grid Import Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-2', parent_id: null, user_id: null },
        },
        'sensor.energy_today': {
          entity_id: 'sensor.energy_today',
          state: '10.2',
          attributes: {
            friendly_name: 'Energy Today',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-3', parent_id: null, user_id: null },
        },
        'sensor.solar_power': {
          entity_id: 'sensor.solar_power',
          state: '900',
          attributes: {
            friendly_name: 'Solar Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-4', parent_id: null, user_id: null },
        },
        'sensor.solar_energy_today': {
          entity_id: 'sensor.solar_energy_today',
          state: '5.1',
          attributes: {
            friendly_name: 'Solar Energy Today',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-5', parent_id: null, user_id: null },
        },
        'sensor.kettle_energy': {
          entity_id: 'sensor.kettle_energy',
          state: '0.3',
          attributes: {
            friendly_name: 'Kettle Energy',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-6', parent_id: null, user_id: null },
        },
        'sensor.kettle_power': {
          entity_id: 'sensor.kettle_power',
          state: '1800',
          attributes: {
            friendly_name: 'Kettle Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'test-7', parent_id: null, user_id: null },
        },
      },
    });
  });

  it('disables continue until all essentials are selected', () => {
    renderWizard();
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();

    chooseOption('Search current power', 'home', 'Home Load Power', 'sensor.home_load_power');
    chooseOption('Search grid import', 'grid', 'Grid Import Power', 'sensor.grid_import_power');
    chooseOption(
      'Search total consumed today',
      'energy_today',
      'Energy Today',
      'sensor.energy_today'
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('reveals optional solar fields and supports add/remove device tracking', () => {
    renderWizard();

    chooseOption('Search current power', 'home', 'Home Load Power', 'sensor.home_load_power');
    chooseOption('Search grid import', 'grid', 'Grid Import Power', 'sensor.grid_import_power');
    chooseOption(
      'Search total consumed today',
      'energy_today',
      'Energy Today',
      'sensor.energy_today'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Solar' }));
    expect(screen.getByPlaceholderText('Search solar power')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    chooseOption('Search device energy', 'kettle', 'Kettle Energy', 'sensor.kettle_energy');
    fireEvent.click(screen.getByRole('button', { name: 'Add device' }));

    expect(screen.getByText('Kettle Energy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove device/i }));
    expect(screen.queryByText('Kettle Energy')).not.toBeInTheDocument();
  });
});
