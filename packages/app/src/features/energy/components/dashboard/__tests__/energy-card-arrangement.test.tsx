import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type EnergyArrangementCard, EnergyCardArrangement } from '../energy-card-arrangement';

const cards: EnergyArrangementCard[] = ['Heating', 'Kitchen', 'New widget'].map((name) => ({
  id: name,
  name,
  size: 'small',
  content: <span>{name}</span>,
}));

describe('Energy card arrangement', () => {
  it('restores saved order, ignores unavailable IDs, and appends new cards', () => {
    const { container } = renderWithProviders(
      <EnergyCardArrangement
        cards={cards}
        order={['Kitchen', 'removed', 'Heating', 'Kitchen']}
        isEditMode={false}
        onOrderChange={vi.fn()}
      />
    );
    expect(
      [...container.querySelectorAll('[data-energy-card-id]')].map((node) =>
        node.getAttribute('data-energy-card-id')
      )
    ).toEqual(['Kitchen', 'Heating', 'New widget']);
    expect(screen.queryByRole('button', { name: 'Arrange Heating' })).not.toBeInTheDocument();
  });

  it('provides an invisible whole-card drag surface and makes card contents inert in Customize mode', () => {
    renderWithProviders(
      <EnergyCardArrangement cards={cards} order={[]} isEditMode onOrderChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Arrange Heating' })).toHaveAttribute(
      'data-dashboard-drag-handle',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Arrange New widget' })).toBeEmptyDOMElement();
    expect(screen.getByText('Heating').parentElement).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Arrange Heating' })).toHaveClass('inset-0');
  });
});
