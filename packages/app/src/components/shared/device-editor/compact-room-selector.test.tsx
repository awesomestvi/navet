import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompactRoomSelector } from './compact-room-selector';

vi.mock('@navet/app/hooks', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'common.room') {
        return 'Room';
      }

      return key;
    },
  }),
  useTheme: () => ({
    theme: 'glass' as const,
  }),
}));

describe('CompactRoomSelector', () => {
  it('keeps the visible themed label while using neutral native popup classes', () => {
    render(
      <CompactRoomSelector
        value="kitchen"
        label="Kitchen"
        options={[
          { label: 'Kitchen', value: 'kitchen' },
          { label: 'Living Room', value: 'living-room' },
        ]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Kitchen', { selector: 'span' })).toBeInTheDocument();

    const select = screen.getByRole('combobox', { name: 'Room' });
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass('bg-white', 'text-slate-900', 'appearance-none', 'opacity-0');
    expect(select).not.toHaveClass('text-white');
  });

  it('forwards room changes through the native select', () => {
    const onChange = vi.fn();

    render(
      <CompactRoomSelector
        value="kitchen"
        label="Kitchen"
        options={[
          { label: 'Kitchen', value: 'kitchen' },
          { label: 'Living Room', value: 'living-room' },
        ]}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Room' }), {
      target: { value: 'living-room' },
    });

    expect(onChange).toHaveBeenCalledWith('living-room');
  });
});
