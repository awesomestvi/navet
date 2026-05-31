import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { automationEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/automation';
import { lightEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/light';
import { sceneEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/scene';
import { scriptEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/script';
import { makeHassEntityFixture } from '@navet/app/test/fixtures/home-assistant/shared';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callServiceMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn().mockResolvedValue(undefined),
}));

function getDomain(entityId: string) {
  const nativeId = entityId.replace(/^[^:]+:/, '');
  return nativeId.includes('.') ? nativeId.split('.', 1)[0] || 'homeassistant' : 'homeassistant';
}

vi.mock('@navet/app/services/home-assistant.service', () => {
  const getState = () => homeAssistantStore.getState();

  return {
    homeAssistantService: {
      addListener: vi.fn(() => () => {}),
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
      getConfig: vi.fn(() => getState().config),
      getConnection: vi.fn(() => null),
      getEntities: vi.fn(() => getState().entities),
      getEntityRegistry: vi.fn(() => getState().entityRegistry),
      getPanelHass: vi.fn(() => null),
      isConnected: vi.fn(() => true),
      signPath: vi.fn(async (path: string) => ({ path })),
    },
  };
});

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: async ({
    type,
    entityId,
  }: {
    type: 'turn_on' | 'turn_off';
    entityId: string;
  }) => {
    await callServiceMock(getDomain(entityId), type, {}, { entity_id: entityId });
    return {
      accepted: true,
      requiresEventConfirmation: true,
    };
  },
}));

import { TasksSection } from '@navet/app/features/tasks/index';

function setRoutineEntities() {
  const automationCoffee = automationEntityFactory({
    friendly_name: 'Brew coffee',
    description: 'Starts the coffee machine before breakfast.',
    mode: 'single',
    current: 1,
  });
  automationCoffee.entity_id = 'automation.coffee';

  const automationNight = automationEntityFactory({
    friendly_name: 'Night mode',
    description: undefined,
    last_triggered: undefined,
  });
  automationNight.entity_id = 'automation.night';
  automationNight.state = 'off';

  const movieScene = sceneEntityFactory({
    friendly_name: 'Movie time',
  });
  movieScene.entity_id = 'scene.movie';

  const goodnightScript = scriptEntityFactory({
    friendly_name: 'Good night',
  });
  goodnightScript.entity_id = 'script.goodnight';

  const sunEntity = makeHassEntityFixture({
    entityId: 'sun.sun',
    state: 'below_horizon',
    attributes: { friendly_name: 'Sun' },
  });

  const kitchenLight = lightEntityFactory({
    friendly_name: 'Kitchen light',
  });
  kitchenLight.entity_id = 'light.kitchen';
  kitchenLight.state = 'off';

  const counterLight = lightEntityFactory({
    friendly_name: 'Counter light',
  });
  counterLight.entity_id = 'light.counter';
  counterLight.state = 'off';

  homeAssistantStore.setState({
    ...homeAssistantStore.getState(),
    connected: true,
    areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
    deviceRegistry: [{ id: 'device-1', area_id: 'kitchen' }],
    entityRegistry: [{ entity_id: 'automation.coffee', device_id: 'device-1' }],
    entities: {
      [automationCoffee.entity_id]: automationCoffee,
      [automationNight.entity_id]: automationNight,
      [movieScene.entity_id]: movieScene,
      [goodnightScript.entity_id]: goodnightScript,
      [sunEntity.entity_id]: sunEntity,
      [kitchenLight.entity_id]: kitchenLight,
      [counterLight.entity_id]: counterLight,
    },
  });
}

describe('TasksSection', () => {
  beforeEach(async () => {
    await resetAppStores();
    callServiceMock.mockClear();
  });

  it('renders a loading state before Home Assistant entities hydrate', () => {
    renderWithProviders(<TasksSection />);

    expect(screen.getByLabelText('Loading routines')).toBeInTheDocument();
  });

  it('renders the empty state without routine creation when no routines exist', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      connected: true,
      entities: {},
    });

    renderWithProviders(<TasksSection />);

    expect(screen.getByText('No Tasks')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create routine' })).not.toBeInTheDocument();
  });

  it('renders automations, scenes, and scripts from Home Assistant entities', () => {
    setRoutineEntities();

    renderWithProviders(<TasksSection />);

    expect(screen.getByText('Routines')).toBeInTheDocument();
    expect(screen.getAllByText('Automations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Brew coffee').length).toBeGreaterThan(0);
    expect(screen.getByText('Night mode')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getAllByText('Scripts').length).toBeGreaterThan(0);
    expect(screen.getByText('Movie time')).toBeInTheDocument();
    expect(screen.getAllByText('Good night').length).toBeGreaterThan(0);
  });

  it('filters automations with active and disabled pills', () => {
    setRoutineEntities();

    renderWithProviders(<TasksSection />);

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Active automations' }));

    expect(screen.getByRole('button', { name: 'Run Brew coffee' })).toBeInTheDocument();
    expect(screen.queryByText('Night mode')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disabled automations' }));

    expect(screen.queryByRole('button', { name: 'Run Brew coffee' })).not.toBeInTheDocument();
    expect(screen.getByText('Night mode')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByRole('button', { name: 'Run Brew coffee' })).toBeInTheDocument();
    expect(screen.getByText('Night mode')).toBeInTheDocument();
  });

  it('shows a reconnect warning while preserving runnable Home Assistant routines', () => {
    setRoutineEntities();
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      connected: false,
    });

    renderWithProviders(<TasksSection />);

    expect(screen.getByText('Some routine details are unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Movie time' })).toBeInTheDocument();
  });

  it('routes routine actions through documented Home Assistant services', async () => {
    setRoutineEntities();

    renderWithProviders(<TasksSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Brew coffee' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Movie time' }));
    fireEvent.click(screen.getByRole('button', { name: 'Good night' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Brew coffee' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Night mode' }));

    await waitFor(() => {
      expect(callServiceMock).toHaveBeenNthCalledWith(
        1,
        'automation',
        'trigger',
        {},
        { entity_id: 'automation.coffee' }
      );
      expect(callServiceMock).toHaveBeenNthCalledWith(
        2,
        'scene',
        'turn_on',
        {},
        { entity_id: 'scene.movie' }
      );
      expect(callServiceMock).toHaveBeenNthCalledWith(
        3,
        'script',
        'turn_on',
        {},
        { entity_id: 'script.goodnight' }
      );
      expect(callServiceMock).toHaveBeenNthCalledWith(
        4,
        'automation',
        'turn_off',
        {},
        { entity_id: 'automation.coffee' }
      );
      expect(callServiceMock).toHaveBeenNthCalledWith(
        5,
        'automation',
        'turn_on',
        {},
        { entity_id: 'automation.night' }
      );
    });
  });

  it('loads read-only automation details when expanded', async () => {
    setRoutineEntities();

    renderWithProviders(<TasksSection />);

    expect(screen.queryByText('automation.coffee')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('The time reaches 07:00:00')).toBeInTheDocument();
      expect(screen.getByText('Sun is below_horizon')).toBeInTheDocument();
      expect(screen.getByText('Turn on Kitchen light and Counter light')).toBeInTheDocument();
      expect(screen.getByText('automation.coffee')).toBeInTheDocument();
    });
  });
});
