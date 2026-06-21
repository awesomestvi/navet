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

    expect(screen.getAllByText('Add Card').length).toBeGreaterThan(0);
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

  it('shows the energy metric template and maps it to an info card when added', () => {
    const onAddCard = vi.fn();

    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={onAddCard}
        onAddLibraryCard={() => {}}
        currentRoom="Energy"
        libraryCards={demoLibraryCards}
        showCardsTab={false}
        allowedTemplateIds={['energy-now', 'energy-metric']}
      />
    );

    expect(screen.getByText('Energy Now')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Energy Metric').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: /add widget/i }));

    expect(onAddCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'energy-metric',
        cardType: 'info',
        initialData: {
          sensorCategoryFilter: 'energy',
        },
      }),
      'medium'
    );
    expect(screen.queryByText('Battery Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  it('does not expose extra-small sizing for the energy metric template', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Energy"
        libraryCards={demoLibraryCards}
        showCardsTab={false}
        allowedTemplateIds={['energy-now', 'energy-metric']}
      />
    );

    fireEvent.click(screen.getByText('Energy Metric').closest('button') as HTMLButtonElement);

    expect(screen.queryByRole('button', { name: /^extra-small\b/i })).not.toBeInTheDocument();
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
