import { fireEvent, screen } from '@testing-library/react';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderWithProviders } from '@/test/render';
import { WidgetCard } from '../widget-card';

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
};

describe('WidgetCard sensor group', () => {
  beforeEach(() => {
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
      ],
    });
  });

  it('renders persisted sensor entity ids as live readings', () => {
    renderWithProviders(
      <WidgetCard
        isEditMode
        card={{
          id: 'custom-sensor-group',
          type: 'sensor-group',
          size: 'medium',
          room: 'Kitchen',
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature'],
          },
          createdAt: 1,
        }}
      />
    );

    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Temperature')).toBeInTheDocument();
    expect(screen.getByText('21.4')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
  });

  it('shows a card-specific empty state when no sensors are selected', () => {
    renderWithProviders(
      <WidgetCard
        isEditMode={false}
        card={{
          id: 'custom-sensor-group',
          type: 'sensor-group',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
    expect(screen.getByText('No sensors selected')).toBeInTheDocument();
    expect(screen.getByText('Search and add sensors below')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open settings for Sensor group' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Sensors' }));

    expect(screen.getByText('Sensor group')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search sensors...')).toBeInTheDocument();
  });

  it('updates the custom card name and room from the settings header', () => {
    const onUpdate = vi.fn();

    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={onUpdate}
        card={{
          id: 'custom-sensor-group',
          type: 'sensor-group',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Sensors' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Sensor group' }));
    fireEvent.change(screen.getByLabelText('Card name'), {
      target: { value: 'Kitchen sensors' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save card name' }));
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '__home__' } });

    expect(onUpdate).toHaveBeenCalledWith('custom-sensor-group', {
      data: {
        name: 'Kitchen sensors',
      },
    });
    expect(onUpdate).toHaveBeenCalledWith('custom-sensor-group', { room: '__home__' });
  });

  it('updates selected sensor entity ids as sensors are added', () => {
    const onUpdate = vi.fn();

    renderWithProviders(
      <WidgetCard
        isEditMode
        onUpdate={onUpdate}
        card={{
          id: 'custom-sensor-group',
          type: 'sensor-group',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Sensors' }));
    fireEvent.focus(screen.getByPlaceholderText('Search sensors...'));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Kitchen Humidity/i }));

    expect(onUpdate).toHaveBeenCalledWith('custom-sensor-group', {
      data: {
        sensorEntityIds: ['sensor.kitchen_humidity'],
      },
    });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Remove sensor' }));

    expect(onUpdate).toHaveBeenCalledWith('custom-sensor-group', {
      data: {
        sensorEntityIds: [],
      },
    });
  });
});
