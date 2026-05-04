import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { makeHassEntity } from '../../test-utils';

const { callServiceMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/services/home-assistant.service', async () => {
  const actual = await vi.importActual<typeof import('@/app/services/home-assistant.service')>(
    '@/app/services/home-assistant.service'
  );

  return {
    ...actual,
    homeAssistantService: {
      ...actual.homeAssistantService,
      callService: callServiceMock,
      getAutomationConfig: vi.fn(async (entityId: string) => ({
        config: {
          description:
            entityId === 'automation.coffee'
              ? 'Starts the coffee machine before breakfast.'
              : undefined,
          triggers: [{ trigger: 'time', at: '07:00:00' }],
          conditions: [{ condition: 'state', entity_id: 'sun.sun', state: 'below_horizon' }],
          actions: [
            { action: 'light.turn_on', target: { entity_id: ['light.kitchen', 'light.counter'] } },
          ],
        },
      })),
    },
  };
});

import { TasksSection } from '../../index';

describe('TasksSection', () => {
  beforeEach(async () => {
    await resetAppStores();
    callServiceMock.mockClear();
  });

  it('renders the empty state when no automations exist', () => {
    renderWithProviders(<TasksSection />);

    expect(screen.getByText('No Tasks')).toBeInTheDocument();
    expect(
      screen.getByText(/You don't have any Home Assistant automations available yet\./)
    ).toBeInTheDocument();
  });

  it('renders the automations group with enabled and disabled items', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      deviceRegistry: [{ id: 'device-1', area_id: 'kitchen' }],
      entityRegistry: [{ entity_id: 'automation.coffee', device_id: 'device-1' }],
      entities: {
        'automation.coffee': makeHassEntity({
          entity_id: 'automation.coffee',
          state: 'on',
          attributes: {
            friendly_name: 'Brew coffee',
            last_triggered: '2026-05-04T07:15:00.000Z',
            description: 'Starts the coffee machine before breakfast.',
            mode: 'single',
            current: 1,
          },
        }),
        'automation.night': makeHassEntity({
          entity_id: 'automation.night',
          state: 'off',
          attributes: {
            friendly_name: 'Night mode',
          },
        }),
      },
    });

    renderWithProviders(<TasksSection />);

    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByText('Automations')).toBeInTheDocument();
    expect(screen.getByText('2 automations')).toBeInTheDocument();
    expect(screen.getByText('Brew coffee')).toBeInTheDocument();
    expect(screen.getByText('Night mode')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText(/Last run/)).toBeInTheDocument();
  });

  it('shows a read-only details view for an automation', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      entities: {
        'automation.coffee': makeHassEntity({
          entity_id: 'automation.coffee',
          state: 'on',
          attributes: {
            friendly_name: 'Brew coffee',
            description: 'Starts the coffee machine before breakfast.',
            mode: 'single',
            current: 1,
          },
        }),
      },
    });

    renderWithProviders(<TasksSection />);

    expect(screen.getByText('Starts the coffee machine before breakfast.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByText('What it does')).toBeInTheDocument();
    expect(screen.getByText('automation.coffee')).toBeInTheDocument();
    expect(screen.getByText('single')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('loads automation config details and shows summarized actions', async () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      entities: {
        'automation.coffee': makeHassEntity({
          entity_id: 'automation.coffee',
          state: 'on',
          attributes: {
            friendly_name: 'Brew coffee',
          },
        }),
        'sun.sun': makeHassEntity({
          entity_id: 'sun.sun',
          state: 'below_horizon',
          attributes: {
            friendly_name: 'Sun',
          },
        }),
        'light.kitchen': makeHassEntity({
          entity_id: 'light.kitchen',
          state: 'off',
          attributes: {
            friendly_name: 'Kitchen light',
          },
        }),
        'light.counter': makeHassEntity({
          entity_id: 'light.counter',
          state: 'off',
          attributes: {
            friendly_name: 'Counter light',
          },
        }),
      },
    });

    renderWithProviders(<TasksSection />);

    await waitFor(() => {
      expect(screen.getByText('Starts the coffee machine before breakfast.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => {
      expect(screen.getAllByText('Starts the coffee machine before breakfast.')).toHaveLength(2);
      expect(screen.getByText('The time reaches 07:00:00')).toBeInTheDocument();
      expect(screen.getByText('Sun is below_horizon')).toBeInTheDocument();
      expect(screen.getByText('Turn on Kitchen light and Counter light')).toBeInTheDocument();
      expect(screen.getByText('automation.coffee')).toBeInTheDocument();
      expect(screen.queryByText('light.kitchen')).not.toBeInTheDocument();
      expect(screen.queryByText('sun.sun')).not.toBeInTheDocument();
    });
  });

  it('wires run and enable or disable actions through the Home Assistant service', async () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      entities: {
        'automation.coffee': makeHassEntity({
          entity_id: 'automation.coffee',
          state: 'on',
          attributes: { friendly_name: 'Brew coffee' },
        }),
        'automation.night': makeHassEntity({
          entity_id: 'automation.night',
          state: 'off',
          attributes: { friendly_name: 'Night mode' },
        }),
      },
    });

    renderWithProviders(<TasksSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Brew coffee' }));

    await waitFor(() => {
      expect(callServiceMock).toHaveBeenNthCalledWith(
        1,
        'automation',
        'trigger',
        {},
        { entity_id: 'automation.coffee' }
      );
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Brew coffee' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Night mode' }));

    await waitFor(() => {
      expect(callServiceMock).toHaveBeenNthCalledWith(
        2,
        'automation',
        'turn_off',
        {},
        { entity_id: 'automation.coffee' }
      );
      expect(callServiceMock).toHaveBeenNthCalledWith(
        3,
        'automation',
        'turn_on',
        {},
        { entity_id: 'automation.night' }
      );
    });
  });
});
