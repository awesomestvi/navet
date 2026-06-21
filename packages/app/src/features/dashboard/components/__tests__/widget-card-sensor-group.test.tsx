import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetCard } from '../widget-card';

const sensorHistoryMock = vi.hoisted(() => ({
  useSensorStatisticsHistory: vi.fn(),
}));

vi.mock('@navet/app/features/sensors/hooks/use-sensor-statistics-history', () => sensorHistoryMock);

function entity(
  entityId: string,
  state: string,
  attributes: HassEntity['attributes'] = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    context: { id: 'context', parent_id: null, user_id: null },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
  };
}

const entities: HassEntities = {
  'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.4', {
    friendly_name: 'Kitchen Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  'sensor.kitchen_humidity': entity('sensor.kitchen_humidity', '48', {
    friendly_name: 'Kitchen Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
  }),
  'sensor.remaining_electricity': entity('sensor.remaining_electricity', '199.28', {
    friendly_name: 'Remaining Electricity',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  }),
};

describe('WidgetCard info widget', () => {
  beforeEach(() => {
    sensorHistoryMock.useSensorStatisticsHistory.mockReturnValue({
      points: [],
      canFetch: false,
      hasHistory: false,
    });
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities,
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      entityRegistry: [
        {
          entity_id: 'sensor.kitchen_temperature',
          area_id: 'kitchen',
        },
        {
          entity_id: 'sensor.kitchen_humidity',
          area_id: 'kitchen',
        },
        {
          entity_id: 'sensor.remaining_electricity',
          area_id: 'kitchen',
        },
      ],
    });
  });

  it('renders persisted sensor entity ids as live readings', async () => {
    renderWithProviders(
      <WidgetCard
        isEditMode
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature'],
          },
          createdAt: 1,
        }}
      />
    );

    expect(await screen.findByText('Kitchen Temperature')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('21.4')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
  });

  it('renders an info card with a sparkline when a single numeric sensor has recorder history', async () => {
    sensorHistoryMock.useSensorStatisticsHistory.mockReturnValue({
      points: [
        { value: 20.8, timestampMs: 1, endTimestampMs: 2, minValue: 20.1, maxValue: 21.1 },
        { value: 21.4, timestampMs: 2, endTimestampMs: 3, minValue: 21.1, maxValue: 21.6 },
      ],
      canFetch: true,
      hasHistory: true,
    });

    renderWithProviders(
      <WidgetCard
        isEditMode={false}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature'],
          },
          createdAt: 1,
        }}
      />
    );

    expect(await screen.findByText('Kitchen Temperature')).toBeInTheDocument();
    expect(screen.getByTestId('sensor-history-sparkline')).toBeInTheDocument();
  });

  it('renders a collection layout from the info widget when multiple sensors are selected', async () => {
    renderWithProviders(
      <WidgetCard
        isEditMode={false}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
            name: 'Kitchen sensors',
          },
          createdAt: 1,
        }}
      />
    );

    expect(await screen.findByText('Kitchen sensors')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.queryByTestId('sensor-history-sparkline')).not.toBeInTheDocument();
  });

  it('shows a card-specific empty state when no sensors are selected', async () => {
    renderWithProviders(
      <WidgetCard
        isEditMode={false}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
    expect(await screen.findByText('Info')).toBeInTheDocument();
    expect(
      screen.getByText('Pin any sensor or binary sensor as a standalone info card.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open settings for Info' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));

    expect(screen.getByRole('dialog', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search sensors...')).toBeInTheDocument();
  });

  it('updates the custom card name and room from the settings header', async () => {
    const onUpdate = vi.fn();

    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={onUpdate}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Customize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Info' }));
    fireEvent.change(screen.getByLabelText('Card name'), {
      target: { value: 'Kitchen sensors' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save card name' }));
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '__home__' } });

    expect(onUpdate).toHaveBeenCalledWith('custom-info', {
      data: {
        name: 'Kitchen sensors',
      },
    });
    expect(onUpdate).toHaveBeenCalledWith('custom-info', { room: '__home__' });
  });

  it('updates selected sensor entity ids as sensors are added', async () => {
    const onUpdate = vi.fn();

    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={onUpdate}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Customize' }));
    fireEvent.focus(screen.getByPlaceholderText('Search sensors...'));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Kitchen Humidity/i }));

    expect(onUpdate).toHaveBeenCalledWith('custom-info', {
      data: {
        sensorEntityIds: ['home_assistant:sensor.kitchen_humidity'],
      },
    });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Remove sensor' }));

    expect(onUpdate).toHaveBeenCalledWith('custom-info', {
      data: {
        sensorEntityIds: [],
      },
    });
  });

  it('persists unified info widget sensor ids when sensors are added', async () => {
    const onUpdate = vi.fn();

    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={onUpdate}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Customize' }));
    fireEvent.focus(screen.getByPlaceholderText('Search sensors...'));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Kitchen Temperature/i }));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Kitchen Humidity/i }));

    expect(onUpdate).toHaveBeenCalledWith('custom-info', {
      data: {
        sensorEntityIds: ['home_assistant:sensor.kitchen_temperature'],
      },
    });
    expect(onUpdate).toHaveBeenCalledWith('custom-info', {
      data: {
        sensorEntityIds: [
          'home_assistant:sensor.kitchen_temperature',
          'home_assistant:sensor.kitchen_humidity',
        ],
      },
    });
  });

  it('limits energy metric cards to energy-category sensors in the picker', async () => {
    renderWithProviders(
      <WidgetCard
        isEditMode={false}
        card={{
          id: 'custom-energy-info',
          type: 'info',
          size: 'medium',
          room: '__energy__',
          data: {
            sensorCategoryFilter: 'energy',
          },
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Customize' }));

    expect(screen.getByRole('button', { name: /Remaining Electricity/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kitchen Temperature/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kitchen Humidity/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Room')).not.toBeInTheDocument();
  });

  it('adds a selected energy metric sensor and keeps the picker open like home dashboard info cards', async () => {
    const onUpdate = vi.fn();

    renderWithProviders(
      <WidgetCard
        isEditMode={false}
        onUpdate={onUpdate}
        card={{
          id: 'custom-energy-info',
          type: 'info',
          size: 'medium',
          room: '__energy__',
          data: {
            sensorCategoryFilter: 'energy',
          },
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Customize' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Remaining Electricity/i }));

    expect(onUpdate).toHaveBeenCalledWith('custom-energy-info', {
      data: {
        sensorCategoryFilter: 'energy',
        sensorEntityIds: ['home_assistant:sensor.remaining_electricity'],
      },
    });

    expect(screen.getByRole('dialog', { name: 'Info' })).toBeInTheDocument();
  });
});
