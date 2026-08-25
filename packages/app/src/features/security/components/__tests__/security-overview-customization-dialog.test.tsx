import { renderWithProviders } from '@navet/app/test/render';
import type { CameraDevice, DeviceWithType, LockDevice } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SecurityOverviewCustomizationDialog } from '../security-overview-customization-dialog';

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

describe('SecurityOverviewCustomizationDialog', () => {
  it('selects and orders mixed security entities before saving', () => {
    const onSave = vi.fn();
    renderWithProviders(
      <SecurityOverviewCustomizationDialog
        automaticEntityIds={[camera.id]}
        entities={[camera, lock] as DeviceWithType[]}
        isOpen
        onOpenChange={vi.fn()}
        onSave={onSave}
        preference={{ mode: 'auto', entityIds: [] }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Manual/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Front door/i }));
    fireEvent.click(screen.getByRole('button', { name: /Order/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Front door earlier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({
      mode: 'custom',
      entityIds: ['lock.front', 'camera.front'],
    });
  });

  it('keeps Save disabled when a manual overview has no entities', () => {
    renderWithProviders(
      <SecurityOverviewCustomizationDialog
        automaticEntityIds={[]}
        entities={[lock] as DeviceWithType[]}
        isOpen
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        preference={{ mode: 'custom', entityIds: [] }}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
