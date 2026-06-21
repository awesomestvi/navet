import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatteryOverviewWidget } from '../battery-overview-widget';

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

const batteryEntities: HassEntities = {
  'sensor.phone_battery': entity('sensor.phone_battery', '82', {
    friendly_name: 'Phone Battery',
    device_class: 'battery',
  }),
};

describe('BatteryOverviewWidget', () => {
  beforeEach(() => {
    homeAssistantStore.setState(homeAssistantStore.getInitialState(), true);
  });

  it('shows a card empty state when no battery sensors are available', () => {
    renderWithProviders(<BatteryOverviewWidget onUpdate={vi.fn()} />);

    expect(screen.getByText('No battery sensors found')).toBeInTheDocument();
    expect(screen.getByText('No battery sensors available yet.')).toBeInTheDocument();
    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
  });

  it('opens settings from the no-batteries empty state action', async () => {
    renderWithProviders(<BatteryOverviewWidget onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Battery settings' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('Battery settings').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('No battery sensors available yet.')).toBeInTheDocument();
  });

  it('shows a card empty state when all battery sensors are unselected', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: batteryEntities,
    });

    renderWithProviders(
      <BatteryOverviewWidget data={{ selectedEntityIds: [] }} onUpdate={vi.fn()} />
    );

    expect(screen.getByText('No batteries selected')).toBeInTheDocument();
    expect(
      screen.getByText('Choose which battery sensors to show on this card.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Phone Battery')).not.toBeInTheDocument();
  });
});
