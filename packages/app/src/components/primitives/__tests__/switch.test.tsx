import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from '../switch';

describe('Switch', () => {
  it('uses the compact size for every boolean setting', () => {
    renderWithProviders(<Switch aria-label="Motion alerts" checked={false} />);

    const control = screen.getByRole('switch', { name: 'Motion alerts' });
    expect(control).toHaveClass('h-7', 'w-11');
    expect(control).not.toHaveClass('h-9', 'w-14');
    expect(control.firstElementChild).toHaveClass('h-5', 'w-5');
  });
});
