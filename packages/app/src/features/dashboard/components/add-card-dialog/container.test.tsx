import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddCardDialogContainer } from './container';

const demoLibraryCards = [
  {
    id: 'light.kitchen',
    title: 'Kitchen Light',
    subtitle: 'Kitchen',
    meta: 'Light',
    kind: 'device' as const,
  },
];

describe('AddCardDialogContainer', () => {
  it('renders the add card header with interactive pill tabs', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Living Room"
        libraryCards={demoLibraryCards}
      />
    );

    expect(screen.getByText('Add Card')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('Custom card')).toBeInTheDocument();
  });

  it('shows the scene template and forwards its preset data when added', () => {
    const onAddCard = vi.fn();

    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={onAddCard}
        onAddLibraryCard={() => {}}
        currentRoom="Kitchen"
        libraryCards={demoLibraryCards}
        showCardsTab={false}
      />
    );

    fireEvent.click(screen.getByText('Scene').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: /add widget/i }));

    expect(onAddCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'scene',
        cardType: 'button',
        initialData: {
          label: 'Scene',
          service: 'scene.turn_on',
          icon: 'Sparkles',
        },
      }),
      'small'
    );
  });

  it('hides the media stack template from the custom card chooser', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Living Room"
        libraryCards={demoLibraryCards}
        showCardsTab={false}
      />
    );

    expect(screen.queryByText('Media Stack')).not.toBeInTheDocument();
  });
});
