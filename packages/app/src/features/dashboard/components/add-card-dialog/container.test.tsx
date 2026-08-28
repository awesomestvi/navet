import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddCardDialogContainer } from './container';

const demoLibraryCards = [
  {
    id: 'light.kitchen',
    title: 'Kitchen Light',
    subtitle: 'Kitchen',
    room: 'Kitchen',
    meta: 'Light',
    kind: 'device' as const,
    entityType: 'light',
    entityTypeLabel: 'Light',
  },
  {
    id: 'sensor.kitchen_temperature',
    title: 'Kitchen Temperature',
    subtitle: 'Kitchen',
    room: 'Kitchen',
    meta: 'Sensor',
    kind: 'device' as const,
    entityType: 'sensor',
    entityTypeLabel: 'Sensor',
  },
];

describe('AddCardDialogContainer', () => {
  it('renders the expanded workspace with responsive card navigation', () => {
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
    const sidebar = screen.getByRole('navigation', { name: 'Add Card' });
    const allCardsButton = within(sidebar).getByRole('button', { name: /All cards/ });
    expect(allCardsButton).toHaveAttribute('aria-current', 'page');
    expect(within(allCardsButton).getByText('2 entities')).toBeInTheDocument();
    expect(within(allCardsButton).getByText('All cards')).toHaveClass('font-normal');
    expect(within(sidebar).getByRole('button', { name: 'Custom cards' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /Light/ })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /Sensor/ })).toBeInTheDocument();
    const separator = sidebar.querySelector('[data-navigation-workspace-separator]');
    const customCardButton = within(sidebar).getByRole('button', { name: 'Custom cards' });
    expect(within(customCardButton).getByText('Custom cards')).toHaveClass('font-normal');
    expect(separator).toBeInTheDocument();
    expect(
      (separator?.compareDocumentPosition(customCardButton) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Add Card' })).toHaveClass('md:max-w-[1200px]');

    fireEvent.click(customCardButton);
    expect(screen.getByText('Info').closest('[data-custom-card-list]')).toHaveClass(
      'rounded-[24px]',
      'border'
    );
    expect(screen.getByText('Info').closest('button')).toHaveClass('min-h-14');
    expect(
      screen.getByText('Pin any sensor or binary sensor as a standalone info card.')
    ).toHaveClass('whitespace-normal', 'break-words', 'leading-4');
    expect(
      screen.getByText('Pin any sensor or binary sensor as a standalone info card.')
    ).not.toHaveClass('truncate');
  });

  it('filters normal cards from the entity-type sidebar', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Kitchen"
        libraryCards={demoLibraryCards}
      />
    );

    const sidebar = screen.getByRole('navigation', { name: 'Add Card' });
    fireEvent.click(within(sidebar).getByRole('button', { name: /Sensor/ }));

    expect(screen.getByText('Kitchen Temperature')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen Light')).not.toBeInTheDocument();
  });

  it('adds an entity from the dedicated row action', () => {
    const onAddLibraryCard = vi.fn();

    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={onAddLibraryCard}
        currentRoom="Kitchen"
        libraryCards={demoLibraryCards}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add: Kitchen Light' }));

    expect(onAddLibraryCard).toHaveBeenCalledWith('light.kitchen');
    expect(screen.queryByText('Kitchen Light')).not.toBeInTheDocument();
  });

  it('filters cards by room beside search', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Kitchen"
        libraryCards={[
          ...demoLibraryCards,
          {
            id: 'light.living_room',
            title: 'Living Room Light',
            subtitle: 'Living Room',
            room: 'Living Room',
            meta: 'Light',
            kind: 'device',
            entityType: 'light',
            entityTypeLabel: 'Light',
          },
        ]}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Filter' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Living Room' }));

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen Light')).not.toBeInTheDocument();
    expect(screen.queryByText('Kitchen Temperature')).not.toBeInTheDocument();
  });

  it('cycles entity-card sorting through ascending, descending, and default order', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Kitchen"
        libraryCards={[
          {
            id: 'light.zebra',
            title: 'Zebra Light',
            subtitle: 'Kitchen',
            room: 'Kitchen',
            meta: 'Light',
            kind: 'device',
          },
          {
            id: 'light.alpha',
            title: 'Alpha Light',
            subtitle: 'Kitchen',
            room: 'Kitchen',
            meta: 'Light',
            kind: 'device',
          },
        ]}
      />
    );

    const alphaCard = screen.getByText('Alpha Light').closest('[data-dashboard-library-row]');
    const zebraCard = screen.getByText('Zebra Light').closest('[data-dashboard-library-row]');
    expect(alphaCard).not.toBeNull();
    expect(zebraCard).not.toBeNull();
    expect(
      (zebraCard?.compareDocumentPosition(alphaCard as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const sortButton = screen.getByRole('button', { name: 'Sort: Default' });
    expect(sortButton).toHaveAttribute('data-sort-direction', 'none');

    fireEvent.click(sortButton);
    expect(sortButton).toHaveAttribute('data-sort-direction', 'asc');
    expect(
      (alphaCard?.compareDocumentPosition(zebraCard as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(sortButton);
    expect(sortButton).toHaveAttribute('data-sort-direction', 'desc');
    expect(
      (zebraCard?.compareDocumentPosition(alphaCard as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(sortButton);
    expect(sortButton).toHaveAttribute('data-sort-direction', 'none');
    expect(
      (zebraCard?.compareDocumentPosition(alphaCard as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('closes the expanded add card workspace from its header', () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={onClose}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Living Room"
        libraryCards={demoLibraryCards}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Add Card' });
    fireEvent.click(dialog.querySelector('[data-mobile-cover-sheet-dismiss]') as HTMLButtonElement);

    expect(onClose).toHaveBeenCalledOnce();
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

  it('sorts custom cards by translated name in ascending order', () => {
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

    const names = [
      'Action',
      'Battery Overview',
      'Energy Metric',
      'Energy Now',
      'Info',
      'Map',
      'Photo',
      'Quick Note',
      'RSS Feed',
      'Scene',
      'UPS Monitor',
    ];
    const options = names.map((name) => screen.getByText(name).closest('button'));

    for (let index = 0; index < options.length - 1; index += 1) {
      expect(
        (options[index]?.compareDocumentPosition(options[index + 1] as Node) ?? 0) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it('does not match hidden entity ids for plain entity search terms', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Basement"
        libraryCards={[
          {
            id: 'sensor.basement_weather_station_battery',
            title: 'Battery',
            subtitle: 'Basement',
            meta: 'Sensor',
            kind: 'device',
          },
          {
            id: 'weather.home',
            title: 'Home',
            subtitle: 'Home',
            meta: 'Weather',
            kind: 'device',
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search entities'), {
      target: { value: 'weather' },
    });

    expect(screen.queryByText('Battery')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add: Home' })).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search entities'), {
      target: { value: 'sensor.basement_weather_station_battery' },
    });

    expect(screen.getByText('Battery')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add: Home' })).not.toBeInTheDocument();
  });

  it('matches native entity ids supplied by the manual entity catalog', () => {
    renderWithProviders(
      <AddCardDialogContainer
        open
        onClose={() => {}}
        onAddCard={vi.fn()}
        onAddLibraryCard={() => {}}
        currentRoom="Kitchen"
        libraryCards={[
          {
            id: 'home_assistant:sensor.kitchen_temperature',
            title: 'Kitchen Temperature',
            subtitle: 'Kitchen',
            meta: 'Sensor',
            kind: 'device',
            idSearchText: 'home_assistant:sensor.kitchen_temperature sensor.kitchen_temperature',
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search entities'), {
      target: { value: 'sensor.kitchen_temperature' },
    });

    expect(screen.getByText('Kitchen Temperature')).toBeInTheDocument();
  });
});
