import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { Sliders } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { BaseCardDialog } from '.';

describe('BaseCardDialog', () => {
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
