import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../input';
import { Select } from '../select';
import { Textarea } from '../textarea';

describe('form field typography', () => {
  it('uses normal body-sized text for standard field values', () => {
    renderWithProviders(
      <>
        <Input aria-label="Name" />
        <Select aria-label="Room">
          <option value="kitchen">Kitchen</option>
        </Select>
        <Textarea aria-label="Notes" />
      </>
    );

    for (const field of [
      screen.getByRole('textbox', { name: 'Name' }),
      screen.getByRole('combobox', { name: 'Room' }),
      screen.getByRole('textbox', { name: 'Notes' }),
    ]) {
      expect(field).toHaveClass('text-sm', 'font-normal', 'leading-5');
      expect(field).not.toHaveClass('text-base', 'font-medium');
    }
  });
});
