import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../select';

vi.mock('@navet/app/hooks', () => ({
  useTheme: () => ({
    theme: 'glass' as const,
    accentColor: '#f97316',
  }),
}));

describe('Select', () => {
  it('only applies inline focus styles for focus-visible focus', () => {
    render(
      <Select aria-label="Room">
        <option value="kitchen">Kitchen</option>
      </Select>
    );

    const select = screen.getByRole('combobox', { name: 'Room' });
    const originalMatches = select.matches.bind(select);

    select.matches = ((selector: string) =>
      selector === ':focus-visible' ? false : originalMatches(selector)) as typeof select.matches;
    fireEvent.focus(select);
    expect(select.style.borderColor).toBe('');
    expect(select.style.boxShadow).toBe('');

    select.matches = ((selector: string) =>
      selector === ':focus-visible' ? true : originalMatches(selector)) as typeof select.matches;
    fireEvent.blur(select);
    fireEvent.focus(select);
    expect(select.style.borderColor).toBe('rgb(249, 115, 22)');
    expect(select.style.boxShadow).toBe('0 0 0 2px #f9731622');
  });
});
