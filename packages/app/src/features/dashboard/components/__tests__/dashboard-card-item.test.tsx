import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardCardItem } from '../dashboard-card-item';

const { childAction, renderCardMock } = vi.hoisted(() => ({
  childAction: vi.fn(),
  renderCardMock: vi.fn(),
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
  WidgetCard: () => (
    <button type="button" onClick={childAction}>
      widget action
    </button>
  ),
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

describe('DashboardCardItem card locking', () => {
  beforeEach(() => {
    localStorage.clear();
    childAction.mockClear();
    renderCardMock.mockClear();
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
});
