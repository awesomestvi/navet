import { RoomNav } from '@navet/app/components/layout/room-nav';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('RoomNav', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('renders a direct add entity action in edit mode', () => {
    const onAddEntity = vi.fn();

    renderWithProviders(
      <RoomNav
        rooms={['All', 'Living Room', 'Kitchen']}
        activeRoom="All"
        onRoomChange={() => undefined}
        isEditMode
        onToggleEditMode={() => undefined}
        onAddEntity={onAddEntity}
        addEntityLabel="Add Entity"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Entity/i }));

    expect(onAddEntity).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
