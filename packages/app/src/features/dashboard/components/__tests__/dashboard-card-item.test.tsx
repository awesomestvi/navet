import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardCardItem } from '../dashboard-card-item';

const { childAction, renderCardMock, widgetCardMock } = vi.hoisted(() => ({
  childAction: vi.fn(),
  renderCardMock: vi.fn(),
  widgetCardMock: vi.fn(),
}));

vi.mock('../../utils/card-renderer', () => ({
  renderCard: (options: unknown) => {
    renderCardMock(options);
    return (
      <button type="button" onClick={childAction}>
        child action
      </button>
    );
  },
}));

vi.mock('../widget-card', () => ({
  WidgetCard: (props: unknown) => {
    widgetCardMock(props);
    return (
      <button type="button" onClick={childAction}>
        widget action
      </button>
    );
  },
}));

function createLightDevice(): DeviceWithType {
  return {
    id: 'light.kitchen',
    name: 'Kitchen',
    room: 'Kitchen',
    size: 'small',
    state: true,
    brightness: 100,
    temp: 3200,
    type: 'lights',
  };
}

function createSensorDevice(): DeviceWithType {
  return {
    id: 'sensor.kitchen_temperature',
    name: 'Kitchen Temperature',
    room: 'Kitchen',
    size: 'small',
    value: '21',
    unit: '°C',
    type: 'sensors',
  };
}

function createAlarmDevice(): DeviceWithType {
  return {
    id: 'home_assistant:alarm_control_panel.home',
    name: 'Home Alarm',
    room: 'Hall',
    size: 'small',
    value: 'Disarmed',
    unit: '',
    type: 'sensors',
    securityKind: 'alarm',
    deviceClass: 'alarm_control_panel',
  };
}

function createSwitchDevice(): DeviceWithType {
  return {
    id: 'switch.espresso_machine',
    name: 'Espresso Machine',
    room: 'Kitchen',
    size: 'small',
    state: true,
    type: 'switches',
  };
}

function createHumidifierDevice(): DeviceWithType {
  return {
    id: 'humidifier.basement',
    name: 'Basement Dehumidifier',
    room: 'Basement',
    size: 'medium',
    state: true,
    type: 'switches',
    serviceDomain: 'humidifier',
    entityType: 'Dehumidifier',
    deviceClass: 'dehumidifier',
    targetHumidity: 46,
    minHumidity: 35,
    maxHumidity: 70,
    targetHumidityStep: 5,
    mode: 'auto',
    availableModes: ['auto', 'sleep'],
  };
}

function createCameraDevice(): DeviceWithType {
  return {
    id: 'camera.front_door',
    name: 'Front Door',
    room: 'Entrance',
    size: 'large',
    state: 'streaming',
    entityPicture: '/api/camera_proxy/camera.front_door',
    isStreamCapable: true,
    type: 'cameras',
  };
}

describe('DashboardCardItem card locking', () => {
  beforeEach(() => {
    localStorage.clear();
    childAction.mockClear();
    renderCardMock.mockClear();
    widgetCardMock.mockClear();
    useDashboardEntitiesStore.setState(useDashboardEntitiesStore.getInitialState(), true);
  });

  it('marks locked cards inert and blocks pointer interaction outside edit mode', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    const { container } = renderWithProviders(
      <DashboardCardItem
        id="light.kitchen"
        size="small"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        device={createLightDevice()}
      />
    );

    expect(screen.getByRole('img', { name: 'Card locked' })).toBeInTheDocument();
    expect(container.querySelector('[data-card-locked="true"] [inert]')).toBeTruthy();

    const overlay = container.querySelector<HTMLElement>('[data-card-lock-overlay="true"]');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay as HTMLElement);

    expect(childAction).not.toHaveBeenCalled();
  });

  it('keeps locked cards manageable in edit mode and toggles the lock state', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    renderWithProviders(
      <DashboardCardItem
        id="light.kitchen"
        size="small"
        isEditMode
        handleSizeChange={vi.fn()}
        device={createLightDevice()}
      />
    );

    expect(screen.queryByRole('img', { name: 'Card locked' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-card-edit-dock="true"]')).toBeTruthy();
    const lockButton = screen.getByRole('button', { name: 'Unlock card' });
    fireEvent.click(lockButton);

    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([]);
  });

  it('shows the locked indicator for custom cards', () => {
    useDashboardEntitiesStore.getState().lockCard('custom-note');

    renderWithProviders(
      <DashboardCardItem
        id="custom-note"
        size="medium"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        card={{
          id: 'custom-note',
          type: 'note',
          size: 'medium',
          room: 'all',
          createdAt: 1,
        }}
      />
    );

    expect(screen.getByRole('img', { name: 'Card locked' })).toBeInTheDocument();
  });

  it('passes header subtitle overrides into entity card rendering', () => {
    renderWithProviders(
      <DashboardCardItem
        id="sensor.kitchen_temperature"
        size="small"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        headerSubtitleOverride="Kitchen"
        device={createSensorDevice()}
      />
    );

    expect(renderCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ headerSubtitleOverride: 'Kitchen' })
    );
  });

  it('upgrades alarm sensor cards to the alarm panel footprint', () => {
    renderWithProviders(
      <DashboardCardItem
        id="home_assistant:alarm_control_panel.home"
        size="small"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        device={createAlarmDevice()}
      />
    );

    expect(renderCardMock).toHaveBeenCalledWith(expect.objectContaining({ size: 'medium' }));
  });

  it('avoids paint containment for camera cards so live video can compose normally', () => {
    const { container } = renderWithProviders(
      <DashboardCardItem
        id="camera.front_door"
        size="large"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        device={createCameraDevice()}
      />
    );

    expect(container.firstElementChild?.className).toContain('[contain:layout_style]');
    expect(container.firstElementChild?.className).not.toContain('[contain:layout_style_paint]');
  });

  it('adds a settings action to the edit dock for switch cards and forwards the request', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    renderWithProviders(
      <DashboardCardItem
        id="switch.espresso_machine"
        size="small"
        isEditMode
        handleSizeChange={vi.fn()}
        device={createSwitchDevice()}
      />
    );

    const settingsButton = screen.getByRole('button', {
      name: 'Open settings for Espresso Machine',
    });
    fireEvent.click(settingsButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'navet:edit-mode-open-settings',
      })
    );

    dispatchEventSpy.mockRestore();
  });

  it('adds a settings action to the edit dock for custom cards with settings dialogs', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    renderWithProviders(
      <DashboardCardItem
        id="custom-rss"
        size="small"
        isEditMode
        handleSizeChange={vi.fn()}
        card={{
          id: 'custom-rss',
          type: 'rss',
          size: 'small',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    const settingsButton = screen.getByRole('button', {
      name: 'Open settings for custom-rss',
    });
    fireEvent.click(settingsButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'navet:edit-mode-open-settings',
      })
    );

    dispatchEventSpy.mockRestore();
  });

  it('does not add a settings action to the edit dock for security panel cards', () => {
    renderWithProviders(
      <DashboardCardItem
        id="home_assistant:alarm_control_panel.home"
        size="medium"
        isEditMode
        handleSizeChange={vi.fn()}
        device={createAlarmDevice()}
      />
    );

    expect(
      screen.queryByRole('button', {
        name: 'Open settings for Home Alarm',
      })
    ).not.toBeInTheDocument();
  });

  it('clamps action cards to compact sizes and only exposes compact resize options', () => {
    const { container } = renderWithProviders(
      <DashboardCardItem
        id="custom-button"
        size="medium"
        isEditMode
        handleSizeChange={vi.fn()}
        card={{
          id: 'custom-button',
          type: 'button',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
        }}
      />
    );

    expect(widgetCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        card: expect.objectContaining({
          id: 'custom-button',
          size: 'small',
          type: 'button',
        }),
      })
    );

    const resizeTrigger = container.querySelector<HTMLButtonElement>(
      '[data-card-edit-dock="true"] button.z-500.group'
    );
    expect(resizeTrigger).toBeTruthy();

    fireEvent.click(resizeTrigger as HTMLButtonElement);

    expect(screen.getByRole('button', { name: /^tiny\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^extra-small\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^small\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^medium\b/i })).not.toBeInTheDocument();
  });

  it('only exposes extra-small and small resize options for single sensor entity cards', () => {
    const { container } = renderWithProviders(
      <DashboardCardItem
        id="sensor.kitchen_temperature"
        size="medium"
        isEditMode
        handleSizeChange={vi.fn()}
        device={{ ...createSensorDevice(), size: 'medium' }}
      />
    );

    expect(renderCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        device: expect.objectContaining({
          id: 'sensor.kitchen_temperature',
          type: 'sensors',
        }),
        size: 'small',
      })
    );

    const resizeTrigger = container.querySelector<HTMLButtonElement>(
      '[data-card-edit-dock="true"] button.z-500.group'
    );
    expect(resizeTrigger).toBeTruthy();

    fireEvent.click(resizeTrigger as HTMLButtonElement);

    expect(screen.getByRole('button', { name: /^extra-small\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^small\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^tiny\b/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^medium\b/i })).not.toBeInTheDocument();
  });

  it('clamps humidifier cards to small and medium sizes and only exposes those resize options', () => {
    const { container } = renderWithProviders(
      <DashboardCardItem
        id="humidifier.basement"
        size="large"
        isEditMode
        handleSizeChange={vi.fn()}
        device={createHumidifierDevice()}
      />
    );

    expect(renderCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        device: expect.objectContaining({
          id: 'humidifier.basement',
          serviceDomain: 'humidifier',
          type: 'switches',
        }),
        size: 'medium',
      })
    );

    const resizeTrigger = container.querySelector<HTMLButtonElement>(
      '[data-card-edit-dock="true"] button.z-500.group'
    );
    expect(resizeTrigger).toBeTruthy();

    fireEvent.click(resizeTrigger as HTMLButtonElement);

    expect(screen.getByRole('button', { name: /^small\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^medium\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^tiny\b/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^extra-small\b/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^large\b/i })).not.toBeInTheDocument();
  });

  it('lets single-sensor info cards use extra-small through large', () => {
    const { container } = renderWithProviders(
      <DashboardCardItem
        id="custom-info"
        size="medium"
        isEditMode
        handleSizeChange={vi.fn()}
        card={{
          id: 'custom-info',
          type: 'info',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature'],
          },
        }}
      />
    );

    expect(widgetCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        card: expect.objectContaining({
          id: 'custom-info',
          size: 'medium',
          type: 'info',
        }),
      })
    );

    const resizeTrigger = container.querySelector<HTMLButtonElement>(
      '[data-card-edit-dock="true"] button.z-500.group'
    );
    expect(resizeTrigger).toBeTruthy();

    fireEvent.click(resizeTrigger as HTMLButtonElement);

    expect(screen.getByRole('button', { name: /^extra-small\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^small\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^medium\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^large\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^tiny\b/i })).not.toBeInTheDocument();
  });

  it('shows a single launcher on tiny cards and expands the edit dock on demand', () => {
    renderWithProviders(
      <DashboardCardItem
        id="switch.espresso_machine"
        size="tiny"
        isEditMode
        handleSizeChange={vi.fn()}
        device={{ ...createSwitchDevice(), size: 'tiny' }}
      />
    );

    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open settings for Espresso Machine' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));

    expect(
      screen.getByRole('button', { name: 'Open settings for Espresso Machine' })
    ).toBeInTheDocument();
  });

  it('uses the custom action label in the tiny edit dock overlay title', () => {
    renderWithProviders(
      <DashboardCardItem
        id="custom-button"
        size="tiny"
        isEditMode
        handleSizeChange={vi.fn()}
        card={{
          id: 'custom-1780100261963-vdq80sr8k',
          type: 'button',
          size: 'tiny',
          room: 'Kitchen',
          createdAt: 1,
          data: {
            label: 'Vishal',
            service: 'script.turn_on',
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));

    expect(screen.getByText('Vishal')).toBeInTheDocument();
    expect(screen.queryByText(/custom-1780100261963/i)).not.toBeInTheDocument();
  });
});
