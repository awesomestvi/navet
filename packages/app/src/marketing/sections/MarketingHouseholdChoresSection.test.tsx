import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingHouseholdChoresSection } from './MarketingHouseholdChoresSection';

describe('MarketingHouseholdChoresSection', () => {
  it('updates the summary, mission, and reward from completed chores and can reset', () => {
    renderWithProviders(<MarketingHouseholdChoresSection />);
    expect(screen.getByRole('region', { name: '0/2, Completed' })).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Mission and reward progress' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Mark done$/ })[0]);
    expect(screen.getByRole('region', { name: '1/2, Completed' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('15 points earned');
    fireEvent.click(screen.getByRole('button', { name: /^Mark done$/ }));
    expect(screen.getByRole('region', { name: 'Mission and reward progress' })).toBeInTheDocument();
    expect(screen.getByText('Ready', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Weekend reset complete. Movie night is ready!'
    );
    expect(screen.getByText('100/100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('region', { name: '0/2, Completed' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Mark done$/ })).toHaveLength(2);
  });
  it('presents Household as a Navet feature independent of provider integrations', () => {
    renderWithProviders(<MarketingHouseholdChoresSection />);

    expect(
      screen.getByRole('heading', { name: 'One home. One list. Everyone knows what’s next.' })
    ).toBeInTheDocument();
    expect(screen.getByText(/independent of your smart-home provider/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See how Household works/i })).toHaveAttribute(
      'href',
      'https://docs.navet.app/guide/everyday-control/household-chores/'
    );
  });
});
