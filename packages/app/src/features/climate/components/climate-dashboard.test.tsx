import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClimateDashboardSection } from '../types/climate-dashboard';
import { ClimateDashboard } from './climate-dashboard';

const scrollIntoViewMock = vi.fn();

vi.mock('@navet/app/features/dashboard/device-grid', () => ({
  DeviceGrid: ({ orderedCardIds }: { orderedCardIds: string[] }) => (
    <div data-testid="device-grid">
      {orderedCardIds.map((id) => (
        <button key={id} id={`dashboard-entity-${encodeURIComponent(id)}`} type="button">
          {id}
        </button>
      ))}
    </div>
  ),
}));

const sections: ClimateDashboardSection[] = [
  {
    key: 'climate',
    titleKey: 'sections.climate.title',
    orderedIds: ['climate.living_room'],
  },
  {
    key: 'temperature',
    titleKey: 'sections.climate.temperature.title',
    orderedIds: ['sensor.living_temperature'],
  },
  {
    key: 'airQuality',
    titleKey: 'sections.climate.airQuality.title',
    orderedIds: ['sensor.office_air_quality'],
  },
];

function climateDevice(
  overrides: Partial<Extract<DeviceWithType, { type: 'climate' }>> = {}
): Extract<DeviceWithType, { type: 'climate' }> {
  return {
    id: 'climate.living_room',
    type: 'climate',
    name: 'Living room thermostat',
    room: 'Living room',
    size: 'medium',
    temperature: 21,
    currentTemperature: 21,
    temperatureUnit: 'celsius',
    mode: 'heat',
    action: 'idle',
    supportedClimateModes: ['off', 'heat'],
    ...overrides,
  };
}

function sensor(
  overrides: Partial<Extract<DeviceWithType, { type: 'sensors' }>> &
    Pick<Extract<DeviceWithType, { type: 'sensors' }>, 'id' | 'name' | 'deviceClass'>
): Extract<DeviceWithType, { type: 'sensors' }> {
  return {
    type: 'sensors',
    room: 'Office',
    size: 'small',
    value: '21',
    unit: '',
    status: 'measurement',
    ...overrides,
  };
}

function renderDashboard(devices: DeviceWithType[]) {
  return renderWithProviders(
    <ClimateDashboard
      deviceMap={new Map(devices.map((device) => [device.id, device]))}
      sections={sections}
      temperatureUnit="celsius"
      cardSizes={{}}
      updateCardSize={vi.fn()}
      isEditMode={false}
      onRemoveEntity={vi.fn()}
      densePerformanceMode={false}
      optimizeOffscreenPaint={false}
    />
  );
}

describe('ClimateDashboard', () => {
  beforeEach(() => {
    scrollIntoViewMock.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  it('keeps normal climate calm and collapses missing optional environment data', () => {
    renderDashboard([climateDevice()]);

    expect(screen.queryByRole('status', { name: 'Needs Attention' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mostly comfortable' })).toBeInTheDocument();
    expect(screen.queryByText(/1\/1/)).not.toBeInTheDocument();
    expect(document.querySelector('[data-climate-comfort-banner]')).toBeInTheDocument();
    expect(
      document.querySelector('[data-climate-comfort-metric="temperature"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-climate-comfort-metric="humidity"]')
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-climate-comfort-metric="outdoor"]')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Environmental')).not.toBeInTheDocument();
  });

  it('shows an off room current temperature without presenting its target as an issue', () => {
    renderDashboard([
      climateDevice({ mode: 'off', currentTemperature: 16, temperature: 21 }),
      sensor({
        id: 'sensor.living_temperature',
        name: 'Living temperature',
        room: 'Living room',
        value: '16',
        unit: '°C',
        deviceClass: 'temperature',
      }),
    ]);

    expect(screen.getByRole('heading', { name: 'Mostly comfortable' })).toBeInTheDocument();
    expect(screen.queryByText(/Target 21°/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\/1/)).not.toBeInTheDocument();
  });

  it('groups cards by type by default and can regroup them by room', () => {
    renderDashboard([
      climateDevice(),
      sensor({
        id: 'sensor.living_temperature',
        name: 'Living temperature',
        room: 'Living room',
        value: '21',
        unit: '°C',
        deviceClass: 'temperature',
      }),
      sensor({
        id: 'sensor.office_air_quality',
        name: 'Office air quality',
        value: 'Poor',
        deviceClass: 'air_quality',
        securitySeverity: 'critical',
      }),
    ]);

    const groupingTrigger = screen.getByRole('button', { name: 'Group cards by: Type' });
    expect(groupingTrigger).toHaveTextContent('Type');
    expect(screen.getByTestId('device-grid')).toHaveTextContent('climate.living_room');

    const airQualityTab = screen.getByRole('tab', { name: 'Air Quality' });
    expect(airQualityTab).toHaveTextContent(/^Air Quality$/);
    fireEvent.click(airQualityTab);
    expect(screen.getByTestId('device-grid')).toHaveTextContent('sensor.office_air_quality');

    fireEvent.pointerDown(groupingTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Room' }));
    expect(groupingTrigger).toHaveTextContent('Room');
    fireEvent.click(screen.getByRole('tab', { name: /Office/ }));
    expect(screen.getByTestId('device-grid')).toHaveTextContent('sensor.office_air_quality');
    expect(screen.getByTestId('device-grid')).not.toHaveTextContent('sensor.living_temperature');
  });
});
