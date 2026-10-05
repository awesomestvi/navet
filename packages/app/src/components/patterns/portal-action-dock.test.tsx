import { renderWithProviders } from '@navet/app/test/render';
import * as Dialog from '@radix-ui/react-dialog';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CardActionRow } from './card-action-row';

function Example({ onRename = vi.fn(), nextDialog = false }) {
  const [nextOpen, setNextOpen] = useState(false);
  return (
    <>
      <CardActionRow
        theme="dark"
        rightContent={<button type="button">Behind</button>}
        overflowItems={[
          { key: 'disabled', label: 'Disabled', disabled: true, onSelect: vi.fn() },
          {
            key: 'rename',
            label: 'Rename',
            onSelect: () => {
              onRename();
              if (nextDialog) setNextOpen(true);
            },
          },
          { key: 'delete', label: 'Delete', onSelect: vi.fn() },
        ]}
      />
      <Dialog.Root open={nextOpen} onOpenChange={setNextOpen}>
        <Dialog.Portal>
          <Dialog.Content aria-describedby={undefined}>
            <Dialog.Title>Rename card</Dialog.Title>
            <input aria-label="New name" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

describe('PortalActionDock focus ownership', () => {
  it('focuses the first enabled action, hides background controls, and restores its opener', async () => {
    renderWithProviders(<Example />);
    const opener = screen.getByRole('button', { name: 'More actions' });
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename' })).toHaveFocus());
    expect(screen.getByRole('dialog', { name: 'More actions' })).toHaveAttribute(
      'aria-modal',
      'true'
    );
    expect(screen.queryByRole('button', { name: 'Behind' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rename' }), { key: 'Escape' });
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('runs a selected action once and lets its downstream dialog retain focus', async () => {
    const onRename = vi.fn();
    renderWithProviders(<Example onRename={onRename} nextDialog />);
    const opener = screen.getByRole('button', { name: 'More actions' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'New name' })).toHaveFocus());
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'More actions' })).not.toBeInTheDocument();
  });
});
