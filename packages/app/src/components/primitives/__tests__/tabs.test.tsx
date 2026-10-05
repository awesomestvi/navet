import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TabList, TabPanel, Tabs, TabTrigger } from '../tabs';

vi.mock('@navet/app/hooks', () => ({
  useTheme: () => ({ theme: 'dark', accentColor: '#f97316', primaryColor: 'orange' }),
}));

function Example({ controlled = false, onChange = vi.fn(), cancel = false }) {
  const [value, setValue] = useState('a');
  return (
    <Tabs
      defaultValue="a"
      value={controlled ? value : undefined}
      onValueChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    >
      <TabList>
        <TabTrigger
          value="a"
          onKeyDown={(event) => {
            if (cancel) event.preventDefault();
          }}
        >
          First
        </TabTrigger>
        <TabTrigger value="b" disabled>
          Disabled
        </TabTrigger>
        <TabTrigger value="c">Last</TabTrigger>
      </TabList>
      <TabPanel value="a">
        <button type="button">First panel</button>
      </TabPanel>
      <TabPanel value="c" preserveLayout>
        <button type="button">Last panel</button>
      </TabPanel>
    </Tabs>
  );
}

describe('Tabs keyboard selection', () => {
  it.each([false, true])('skips disabled tabs and wraps with controlled=%s', (controlled) => {
    const onChange = vi.fn();
    render(<Example controlled={controlled} onChange={onChange} />);
    const first = screen.getByRole('tab', { name: 'First' });
    const last = screen.getByRole('tab', { name: 'Last' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute('aria-selected', 'true');
    expect(last).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Last panel' })).toBeVisible();
    expect(onChange.mock.calls).toEqual([['c']]);
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
    expect(onChange.mock.calls).toEqual([['c'], ['a']]);
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(last).toHaveFocus();
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById(last.getAttribute('aria-controls') ?? '')).toHaveAttribute(
      'inert'
    );
  });

  it('respects caller cancellation and leaves Tab to native focus navigation', () => {
    const onChange = vi.fn();
    render(<Example cancel onChange={onChange} />);
    const first = screen.getByRole('tab', { name: 'First' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
});
