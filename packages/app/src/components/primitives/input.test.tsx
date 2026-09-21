import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('allows native date and time controls to shrink inside narrow form grids', () => {
    const { rerender } = renderWithProviders(<Input aria-label="Start date" type="date" />);

    const dateInput = screen.getByLabelText('Start date');
    expect(dateInput.parentElement).toHaveClass('min-w-0', 'max-w-full');
    expect(dateInput).toHaveClass('min-w-0', 'max-w-full', 'w-full');

    rerender(<Input aria-label="Due time" type="time" />);
    expect(screen.getByLabelText('Due time')).toHaveClass('min-w-0', 'max-w-full', 'w-full');
  });
});
