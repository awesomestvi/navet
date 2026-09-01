import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import { Sliders } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { BaseCardDialog } from '.';

describe('BaseCardDialog', () => {
  it('anchors the mobile sheet dismiss independently from its header', () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <BaseCardDialog
        variant="sheet"
        isOpen
        onOpenChange={onOpenChange}
        title="Sections"
        description="Jump between every top-level area"
        theme="dark"
      >
        <button type="button" data-cover-sheet-inline-dismiss>
          Inline close
        </button>
      </BaseCardDialog>
    );

    const dialog = screen.getByRole('dialog', { name: 'Sections' });
    expect(dialog).toHaveClass('max-sm:!h-[80dvh]', 'max-sm:!rounded-t-[30px]');
    const dragHandle = screen.getByRole('button', {
      name: 'Drag dialog to fullscreen or close',
    });
    expect(dragHandle).toHaveClass('mt-1', 'mb-0', 'h-9', 'w-20');
    expect(dragHandle.firstElementChild).toHaveClass('h-1', 'w-10');
    const dismissButton = dialog.querySelector('[data-mobile-cover-sheet-dismiss]');
    expect(dismissButton?.parentElement).toHaveClass('absolute', 'top-3', 'right-3', 'z-30');
    expect(dialog).toHaveClass('max-sm:[&_[data-cover-sheet-inline-dismiss]]:!hidden');

    fireEvent.click(dismissButton as HTMLButtonElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('presents fullscreen workspaces as cover sheets on phones', () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <BaseCardDialog
        variant="fullscreen"
        isOpen
        onOpenChange={onOpenChange}
        title="Add card"
        description="Choose a card"
        theme="dark"
      >
        <div>Add card workspace</div>
      </BaseCardDialog>
    );

    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    expect(dialog).toHaveClass(
      'max-sm:!right-0',
      'max-sm:!bottom-0',
      'max-sm:!left-0',
      'max-sm:!h-[80dvh]',
      'max-sm:!rounded-t-[30px]',
      'max-sm:!rounded-b-none'
    );
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('auto');
    const dragHandle = screen.getByRole('button', {
      name: 'Drag dialog to fullscreen or close',
    });
    expect(dragHandle).toHaveClass('mt-1', 'mb-0', 'h-9');
    expect(dragHandle.firstElementChild).toHaveClass('w-10');
    const dismissButton = dialog.querySelector('[data-mobile-cover-sheet-dismiss]');
    expect(dismissButton).toHaveAccessibleName('Close');
    expect(dismissButton?.parentElement).toHaveClass('absolute', 'top-3', 'right-3', 'z-30');

    fireEvent.click(dismissButton as HTMLButtonElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();

    fireEvent.pointerDown(dragHandle, { clientY: 600, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(window, { clientY: 500, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(window, { clientY: 500, pointerId: 1, pointerType: 'touch' });

    expect(dialog).toHaveClass('max-sm:!h-auto');
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('0.5rem');
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('renders the room selector as a plain eyebrow and keeps actions palette-aware', () => {
    renderWithProviders(
      <BaseCardDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Plant Light"
        description="Light"
        theme="dark"
        tabs={[
          { key: 'controls', label: 'Controls', icon: Sliders, content: <div>Controls</div> },
          { key: 'customize', label: 'Customize', icon: Sliders, content: <div>Customize</div> },
        ]}
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
    expect(editButton.parentElement).toHaveClass('items-center');
    expect(editButton).toHaveClass('h-7', 'after:-inset-y-2');
    expect(editButton).not.toHaveClass('min-h-9');
    expect(editButton.parentElement?.parentElement?.parentElement).toHaveClass('max-sm:pr-0');

    const dialog = screen.getByRole('dialog', { name: 'Plant Light' });
    const wholeSheetScrollArea = dialog.querySelector('[dir="ltr"]');
    expect(wholeSheetScrollArea).toHaveClass('max-sm:-mt-5', 'max-sm:min-h-0', 'max-sm:flex-1');
    expect(wholeSheetScrollArea?.parentElement).toHaveClass(
      'max-sm:flex',
      'max-sm:min-h-0',
      'max-sm:flex-1',
      'max-sm:flex-col'
    );
    const header = dialog.querySelector('[data-card-dialog-header]');
    expect(header).toHaveClass('border-b', 'px-4', 'py-3', 'max-sm:pt-2');
    expect(header?.nextElementSibling).toHaveClass('p-6', 'max-sm:p-4');
    expect(within(header as HTMLElement).getByRole('button', { name: 'Controls' })).toBeVisible();
    expect(within(header as HTMLElement).getByRole('combobox', { name: 'Room' })).toBeVisible();
    const mobileDismissButton = dialog.querySelector('[data-mobile-cover-sheet-dismiss]');
    expect(mobileDismissButton?.parentElement).toHaveClass('absolute', 'top-3', 'right-3', 'z-30');
    expect(mobileDismissButton).toHaveStyle({
      backgroundColor: 'rgba(255, 102, 0, 0.14)',
      borderColor: 'rgba(255, 102, 0, 0.24)',
    });
    expect(dialog.querySelector('[data-cover-sheet-inline-dismiss]')).toBeInTheDocument();
    expect(dialog).toHaveClass('max-sm:[&_[data-cover-sheet-inline-dismiss]]:!hidden');

    const roomSelect = within(header as HTMLElement).getByRole('combobox', { name: 'Room' });
    expect(roomSelect.parentElement?.parentElement).toHaveClass('text-xs', 'font-medium');
    expect(roomSelect.parentElement?.parentElement).not.toHaveClass('rounded-full', 'border');
    const title = within(header as HTMLElement).getByText('Plant Light');
    expect(
      roomSelect.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Done' })).toHaveStyle({
      backgroundColor: 'rgba(255, 102, 0, 0.14)',
      borderColor: 'rgba(255, 102, 0, 0.24)',
    });
  });

  it('renders entity-backed room selectors as plain eyebrows above the title', () => {
    renderWithProviders(
      <BaseCardDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Window Lamp"
        entityId="light.window_lamp"
        description="Light"
        theme="dark"
        tabs={[{ key: 'controls', label: 'Controls', icon: Sliders, content: <div>Controls</div> }]}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Window Lamp' });
    const header = dialog.querySelector('[data-card-dialog-header]');
    const headerRoomSelect = header?.querySelector('select[aria-label="Room"]');
    const roomEyebrow = headerRoomSelect?.previousElementSibling;
    expect(roomEyebrow).not.toHaveClass('rounded-full', 'h-9', 'px-3');
    expect(
      (headerRoomSelect?.compareDocumentPosition(screen.getByText('Window Lamp')) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(dialog.querySelector('[data-mobile-cover-sheet-actions]')).not.toBeInTheDocument();
  });
});
