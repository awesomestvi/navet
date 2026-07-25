import { BUILT_IN_WALLPAPERS } from '@navet/app/constants/built-in-wallpapers';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isSafeRoomImageUrl, RoomAppearanceDialog } from './room-appearance-dialog';
import { RoomDeleteImpactDialog } from './room-delete-impact-dialog';
import { RoomNameDialog } from './room-name-dialog';
import { RoomTargetDialog } from './room-target-dialog';

describe('room workspace operation dialogs', () => {
  it('accepts only empty or explicit HTTP(S) room image URLs', () => {
    expect(isSafeRoomImageUrl('')).toBe(true);
    expect(isSafeRoomImageUrl('https://example.com/room.jpg')).toBe(true);
    expect(isSafeRoomImageUrl('http://localhost:3000/room.png')).toBe(true);
    expect(isSafeRoomImageUrl('/room.jpg')).toBe(false);
    expect(isSafeRoomImageUrl('data:image/png;base64,abc')).toBe(false);
    expect(isSafeRoomImageUrl('javascript:alert(1)')).toBe(false);
  });

  it('keeps room naming controlled and blocks invalid confirmation', () => {
    const onValueChange = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = renderWithProviders(
      <RoomNameDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Create room"
        description="Add a room to this home."
        nameLabel="Room name"
        value=""
        onValueChange={onValueChange}
        cancelLabel="Cancel"
        confirmLabel="Create room"
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Kitchen' } });
    expect(onValueChange).toHaveBeenCalledWith('Kitchen');
    expect(screen.getByRole('button', { name: 'Create room' })).toBeDisabled();

    rerender(
      <RoomNameDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Create room"
        nameLabel="Room name"
        value="Kitchen"
        onValueChange={onValueChange}
        validationMessage="That room already exists."
        cancelLabel="Cancel"
        confirmLabel="Create room"
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('That room already exists.');
    expect(screen.getByRole('button', { name: 'Create room' })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('filters merge targets and reports a controlled selection', () => {
    const onTargetChange = vi.fn();
    renderWithProviders(
      <RoomTargetDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Merge room"
        searchLabel="Search rooms"
        targetLabel="Merge into"
        emptyTitle="No rooms found"
        emptyDescription="Try another search."
        candidates={[
          { id: 'kitchen', name: 'Kitchen', groupName: 'Downstairs' },
          { id: 'bedroom', name: 'Bedroom', groupName: 'Upstairs' },
        ]}
        query="bed"
        onQueryChange={vi.fn()}
        selectedTargetId={null}
        onTargetChange={onTargetChange}
        cancelLabel="Cancel"
        confirmLabel="Merge rooms"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole('radio', { name: /Kitchen/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Bedroom/ }));
    expect(onTargetChange).toHaveBeenCalledWith('bedroom');
    expect(screen.getByRole('button', { name: 'Merge rooms' })).toBeDisabled();
  });

  it('blocks an unsafe appearance URL and exposes wallpaper choices', () => {
    const onImageChange = vi.fn();
    renderWithProviders(
      <RoomAppearanceDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Room appearance"
        symbolLabel="Room symbol"
        wallpaperLabel="Room image"
        imagePreviewAlt="Room image preview"
        wallpaperOptionLabel={(id) => `Wallpaper ${id}`}
        urlLabel="Image URL"
        invalidUrlMessage="Use an HTTP or HTTPS image URL."
        removeImageLabel="Remove image"
        resetLabel="Reset"
        cancelLabel="Cancel"
        confirmLabel="Apply appearance"
        symbolChoices={[{ value: 'K', label: 'Kitchen', glyph: 'K' }]}
        symbol="K"
        onSymbolChange={vi.fn()}
        image={{ kind: 'url', value: 'javascript:alert(1)' }}
        onImageChange={onImageChange}
        onReset={vi.fn()}
        onConfirm={vi.fn()}
        wallpapers={[BUILT_IN_WALLPAPERS[0]]}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Use an HTTP or HTTPS image URL.');
    expect(screen.getByRole('button', { name: 'Apply appearance' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Wallpaper aurora-haze-01/ }));
    expect(onImageChange).toHaveBeenCalledWith({
      kind: 'asset',
      value: 'builtin:aurora-haze-01',
    });
  });

  it('shows deletion impact before invoking the destructive action', () => {
    const onConfirm = vi.fn();
    const onDestinationChange = vi.fn();
    renderWithProviders(
      <RoomDeleteImpactDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Delete room?"
        roomLabel="Room"
        roomName="Kitchen"
        affectedDevicesLabel="Affected devices"
        affectedDeviceCount={4}
        affectedDeviceSummary="4 devices will become unassigned."
        destinationLabel="Move devices to"
        destinationFallbackLabel="Leave unassigned"
        destinations={[{ id: 'office', name: 'Office' }]}
        onDestinationChange={onDestinationChange}
        providerSourcesLabel="Connected systems"
        noProviderSourcesLabel="No connected rooms"
        providerSources={[
          {
            id: 'home-assistant',
            name: 'Home Assistant',
            summary: 'The linked Kitchen room will be permanently deleted.',
          },
        ]}
        warningMessage="This permanently deletes Kitchen from Home Assistant."
        cancelLabel="Cancel"
        confirmLabel="Delete room"
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('4')).not.toHaveAttribute('aria-hidden');
    expect(
      screen.getByText('The linked Kitchen room will be permanently deleted.')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Move devices to' }), {
      target: { value: 'office' },
    });
    expect(onDestinationChange).toHaveBeenCalledWith('office');
    fireEvent.click(screen.getByRole('button', { name: 'Delete room' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
