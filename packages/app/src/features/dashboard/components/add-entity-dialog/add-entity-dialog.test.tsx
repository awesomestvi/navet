import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { renderWithProviders } from '@navet/app/test/render';
import type { CameraDevice, DeviceWithType, LockDevice } from '@navet/app/types/device.types';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddEntityDialog } from './index';

const camera: CameraDevice & { type: 'cameras' } = {
  id: 'camera.front',
  name: 'Front camera',
  room: 'Entrance',
  size: 'large',
  state: 'idle',
  supportedFeatures: 2,
  isStreamCapable: true,
  isStillImageOnly: false,
  type: 'cameras',
};
const lock: LockDevice & { type: 'locks' } = {
  id: 'lock.front',
  name: 'Front door',
  room: 'Entrance',
  size: 'small',
  state: true,
  type: 'locks',
};
const kitchenCamera = { ...camera, id: 'camera.kitchen', name: 'Kitchen camera', room: 'Kitchen' };
const deviceMap = new Map<string, DeviceWithType>(
  [camera, lock, kitchenCamera].map((device) => [device.id, device])
);
const defaults = {
  open: true,
  onClose: vi.fn(),
  onAddEntity: vi.fn(),
  currentRoom: ALL_ROOMS_ID,
  deviceMap,
  addedEntityIds: [],
};

// Keep dashboard eligibility contracts; add coverage for the shared Home library interaction.
describe('AddEntityDialog', () => {
  it('uses Home library search and type navigation without custom-card actions', () => {
    renderWithProviders(<AddEntityDialog {...defaults} />);
    expect(screen.getByRole('dialog', { name: /add entity/i })).toBeInTheDocument();
    const sidebar = screen.getByRole('navigation', { name: /add entity/i });
    expect(within(sidebar).queryByRole('button', { name: /Custom cards/ })).not.toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('button', { name: /Camera/ }));
    expect(screen.queryByRole('button', { name: 'Add: Front door' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search entities'), {
      target: { value: 'camera.kitchen' },
    });
    expect(screen.getByRole('button', { name: 'Add: Kitchen camera' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add: Front camera' })).not.toBeInTheDocument();
  });

  it('preserves eligible IDs, already-added exclusions, and current-room scope', () => {
    renderWithProviders(
      <AddEntityDialog
        {...defaults}
        currentRoom="Entrance"
        visibleEntityIds={[camera.id, kitchenCamera.id]}
        addedEntityIds={[lock.id]}
      />
    );
    expect(screen.getByRole('button', { name: 'Add: Front camera' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add: Kitchen camera' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add: Front door' })).not.toBeInTheDocument();
  });

  it('forwards the selected entity once and removes it from the open library', () => {
    const onAddEntity = vi.fn();
    renderWithProviders(
      <AddEntityDialog {...defaults} onAddEntity={onAddEntity} actionLabel="Restore" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore: Front camera' }));
    expect(onAddEntity).toHaveBeenCalledExactlyOnceWith(camera.id);
    expect(screen.queryByRole('button', { name: 'Restore: Front camera' })).not.toBeInTheDocument();
  });

  it('does not expose entities when the eligible list is empty', () => {
    renderWithProviders(<AddEntityDialog {...defaults} visibleEntityIds={[]} />);
    expect(screen.queryByRole('button', { name: 'Add: Front camera' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search entities')).toBeInTheDocument();
  });
});
