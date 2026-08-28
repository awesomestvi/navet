import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { NavetEntity } from '@navet/core/types';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LightsDashboard } from '../lights-dashboard';

const setLightsPowerMock = vi.hoisted(() => vi.fn());
const dispatchEntityCommandMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastWarningMock = vi.hoisted(() => vi.fn());
const providerModels = vi.hoisted(() => ({ value: {} as Record<string, NavetEntity> }));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@navet/app/features/lighting/components/light-card', () => ({
  LightCard: ({ name }: { name: string }) => <button type="button">{name}</button>,
}));

vi.mock('@navet/app/hooks/use-provider-device', () => ({
  useProviderEntityModels: () => providerModels.value,
}));

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, warning: toastWarningMock },
}));

vi.mock('../light-dashboard-actions', () => ({
  setLightsPower: setLightsPowerMock,
}));

function lightDevice(id: string, room: string, state: boolean, brightness = 50): DeviceWithType {
  return {
    id,
    name: id.replace('light.', '').replaceAll('_', ' '),
    room,
    state,
    brightness,
    temp: 4000,
    size: 'small',
    type: 'lights',
    providerId: 'home_assistant',
  };
}

function lightEntity(device: DeviceWithType, overrides: Partial<NavetEntity> = {}): NavetEntity {
  return {
    id: device.id,
    canonicalId: `home_assistant:${device.id}`,
    providerId: 'home_assistant',
    externalId: device.id,
    type: 'light',
    name: device.name,
    room: 'room' in device ? device.room : undefined,
    primaryState: 'state' in device && device.state ? 'on' : 'off',
    availability: 'available',
    attributes: {
      brightnessPct: 'brightness' in device ? device.brightness : undefined,
      colorTemperatureKelvin: 'temp' in device ? device.temp : undefined,
    },
    capabilities: ['toggle', 'brightness', 'color_temperature'],
    ...overrides,
  };
}

const kitchen = lightDevice('light.kitchen', 'Kitchen', true, 70);
const livingRoom = lightDevice('light.living_room', 'Living room', false, 35);
const hallway = lightDevice('light.hallway', 'Hallway', false, 100);

function renderDashboard(
  devices: DeviceWithType[] = [kitchen, livingRoom, hallway],
  entities: NavetEntity[] = devices.map((device) => lightEntity(device))
) {
  providerModels.value = Object.fromEntries(entities.map((entity) => [entity.canonicalId, entity]));

  return renderWithProviders(
    <LightsDashboard
      deviceMap={new Map(devices.map((device) => [device.id, device]))}
      rooms={devices.map((device) => ('room' in device ? device.room : '')).filter(Boolean)}
      cardOrders={{}}
      scenes={[
        {
          id: 'scene.evening',
          type: 'scene',
          name: 'Evening',
          room: 'Unassigned',
          state: 'off',
        },
      ]}
      isEditMode={false}
    />
  );
}

describe('LightsDashboard', () => {
  beforeEach(() => {
    providerModels.value = {};
    setLightsPowerMock.mockReset();
    setLightsPowerMock.mockResolvedValue({ succeeded: 1, failed: 0, skippedUnavailable: 0 });
    dispatchEntityCommandMock.mockReset();
    dispatchEntityCommandMock.mockResolvedValue({
      accepted: true,
      requiresEventConfirmation: true,
    });
    toastErrorMock.mockReset();
    toastWarningMock.mockReset();
  });

  it('starts every room collapsed and uses the room icon as power beside disclosure', async () => {
    const { container } = renderDashboard();
    const kitchenRoom = container.querySelector('[data-lights-room-id="Kitchen"]');
    const power = kitchenRoom?.querySelector<HTMLButtonElement>('[aria-pressed]');
    const disclosure = kitchenRoom?.querySelector<HTMLButtonElement>(
      '[data-lights-room-toggle="true"]'
    );

    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(power).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByTestId('lights-room-grid-Kitchen')).not.toBeInTheDocument();
    if (!disclosure || !power) throw new Error('Expected separate Kitchen room controls');

    fireEvent.click(disclosure);

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByTestId('lights-room-grid-Kitchen')).toBeInTheDocument();
    expect(setLightsPowerMock).not.toHaveBeenCalled();

    fireEvent.click(power);

    await waitFor(() => expect(setLightsPowerMock).toHaveBeenCalledTimes(1));
    expect(setLightsPowerMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'light.kitchen' })],
      'off'
    );
  });

  it('does not offer a reciprocal whole-home turn-on action when every light is off', async () => {
    const offKitchen = lightDevice('light.kitchen', 'Kitchen', false, 70);
    const { container } = renderDashboard([offKitchen]);
    const roomPower = container.querySelector('[aria-pressed]');

    expect(container.querySelector('[data-lights-whole-home-power="true"]')).toBeNull();
    if (!roomPower) throw new Error('Expected room power control');

    fireEvent.click(roomPower);

    await waitFor(() => expect(setLightsPowerMock).toHaveBeenCalledTimes(1));
    expect(setLightsPowerMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'light.kitchen' })],
      'on'
    );
  });

  it('sorts unavailable rooms before active rooms and inactive rooms', () => {
    const entities = [
      lightEntity(kitchen),
      lightEntity(livingRoom),
      lightEntity(hallway, { availability: 'unavailable' }),
    ];
    const { container } = renderDashboard([kitchen, livingRoom, hallway], entities);

    expect(
      Array.from(container.querySelectorAll('[data-lights-room-id]')).map((room) =>
        room.getAttribute('data-lights-room-id')
      )
    ).toEqual(['Hallway', 'Kitchen', 'Living room']);
  });

  it('blocks duplicate room, whole-home, and scene commands while a batch is pending', async () => {
    let resolveBatch:
      | ((result: { succeeded: number; failed: number; skippedUnavailable: number }) => void)
      | undefined;
    setLightsPowerMock.mockReturnValue(
      new Promise((resolve) => {
        resolveBatch = resolve;
      })
    );
    const { container } = renderDashboard();
    const wholeHome = container.querySelector<HTMLButtonElement>(
      '[data-lights-whole-home-power="true"]'
    );
    if (!wholeHome) throw new Error('Expected whole-home power control');

    fireEvent.click(wholeHome);
    fireEvent.click(wholeHome);

    expect(setLightsPowerMock).toHaveBeenCalledTimes(1);
    expect(wholeHome).toBeDisabled();
    expect(container.querySelector('[aria-pressed]')).toBeDisabled();
    expect(container.querySelector('[data-lights-scene]')).toBeDisabled();

    await act(async () => {
      resolveBatch?.({ succeeded: 1, failed: 0, skippedUnavailable: 0 });
    });

    await waitFor(() => expect(wholeHome).not.toBeDisabled());
  });

  it('reports partial batch failures through the existing toast pattern', async () => {
    setLightsPowerMock.mockResolvedValue({ succeeded: 1, failed: 1, skippedUnavailable: 0 });
    const { container } = renderDashboard();
    const roomPower = container.querySelector('[aria-pressed]');
    if (!roomPower) throw new Error('Expected room power control');

    fireEvent.click(roomPower);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).toHaveBeenCalledWith('1 updated · 1 failed · 0 unavailable');
  });

  it('exposes scene pending and failure state while blocking competing commands', async () => {
    let resolveScene:
      | ((result: {
          accepted: boolean;
          requiresEventConfirmation: boolean;
          error?: string;
        }) => void)
      | undefined;
    dispatchEntityCommandMock.mockReturnValue(
      new Promise((resolve) => {
        resolveScene = resolve;
      })
    );
    const { container } = renderDashboard();
    const scene = container.querySelector<HTMLButtonElement>('[data-lights-scene]');
    const roomPower = container.querySelector<HTMLButtonElement>('[aria-pressed]');
    if (!scene || !roomPower) throw new Error('Expected scene and room controls');

    fireEvent.click(scene);

    expect(scene).toBeDisabled();
    expect(scene).toHaveTextContent('Evening…');
    expect(roomPower).toBeDisabled();

    await act(async () => {
      resolveScene?.({
        accepted: false,
        requiresEventConfirmation: false,
        error: 'scene unavailable',
      });
    });

    await waitFor(() => expect(scene).not.toBeDisabled());
    expect(toastErrorMock).toHaveBeenCalledWith('Failed to activate scene');
  });
});
