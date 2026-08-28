import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardGroupingNavigation } from './dashboard-grouping-navigation';

describe('DashboardGroupingNavigation', () => {
  it('selects a grouping mode from the neutral dropdown and a count-free item tab', () => {
    const onModeChange = vi.fn();
    const onItemChange = vi.fn();

    renderWithProviders(
      <DashboardGroupingNavigation
        ariaLabel="Media players"
        groupingLabel="Group cards by"
        idPrefix="media-group"
        items={[
          { id: 'audio', label: 'Players & speakers' },
          { id: 'tv', label: 'TVs' },
        ]}
        modes={[
          { id: 'type', label: 'Type' },
          { id: 'room', label: 'Room' },
        ]}
        selectedItemId="audio"
        selectedModeId="type"
        onModeChange={onModeChange}
        onItemChange={onItemChange}
      />
    );

    const groupingTrigger = screen.getByRole('button', { name: 'Group cards by: Type' });
    fireEvent.pointerDown(groupingTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Room' }));
    expect(onModeChange).toHaveBeenCalledWith('room');

    const tvTab = screen.getByRole('tab', { name: 'TVs' });
    expect(tvTab).toHaveTextContent(/^TVs$/);
    fireEvent.click(tvTab);
    expect(onItemChange).toHaveBeenCalledWith('tv');
  });
});
