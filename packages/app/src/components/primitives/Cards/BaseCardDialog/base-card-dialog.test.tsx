import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { Sliders } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { BaseCardDialog } from '.';

describe('BaseCardDialog', () => {
  it('presents fullscreen workspaces as cover sheets on phones', () => {
    renderWithProviders(
      <BaseCardDialog
        variant="fullscreen"
        isOpen
        onOpenChange={vi.fn()}
        title="Add card"
        description="Choose a card"
        theme="dark"
      >
        <div>Add card workspace</div>
      </BaseCardDialog>
    );

    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    expect(dialog).toHaveClass(
      'max-sm:!right-2',
      'max-sm:!bottom-2',
      'max-sm:!left-2',
      'max-sm:!rounded-[30px]'
    );
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('0.5rem');
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('keeps header actions aligned and inherits the card palette for room and Done controls', () => {
    renderWithProviders(
      <BaseCardDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Plant Light"
        description="Light"
        theme="dark"
        tabs={[{ key: 'controls', label: 'Controls', icon: Sliders, content: <div>Controls</div> }]}
        tintColor="#ff6600"
        onTitleChange={vi.fn()}
        roomSelector={{
          value: 'kitchen',
          label: 'Kitchen',
          options: [{ label: 'Kitchen', value: 'kitchen' }],
          onChange: vi.fn(),
        }}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit plant light/i });
    expect(editButton.parentElement).toHaveClass('items-baseline');

    const roomSelect = screen.getByRole('combobox', { name: 'Room' });
    expect(roomSelect.parentElement?.parentElement).toHaveStyle({
      backgroundColor: 'rgba(255, 102, 0, 0.14)',
      borderColor: 'rgba(255, 102, 0, 0.24)',
    });

    expect(screen.getByRole('button', { name: 'Done' })).toHaveStyle({
      backgroundColor: 'rgba(255, 102, 0, 0.14)',
      borderColor: 'rgba(255, 102, 0, 0.24)',
    });
  });
});
