import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingFeatureGridSection } from './MarketingFeatureGridSection';

describe('MarketingFeatureGridSection', () => {
  it('lets visitors switch moments and use the product light controls', () => {
    renderWithProviders(<MarketingFeatureGridSection />);

    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveAttribute(
      'aria-valuenow',
      '35'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Slow morning' }));
    expect(screen.getByRole('button', { name: 'Slow morning' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveAttribute(
      'aria-valuenow',
      '80'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lights out' }));
    expect(screen.getByRole('button', { name: 'Turn reading light on' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Turn reading light on' }));
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveAttribute(
      'aria-valuenow',
      '65'
    );

    fireEvent.click(screen.getByRole('button', { name: 'High brightness 100 percent' }));
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByRole('link', { name: /Explore the whole home/ })).toHaveAttribute(
      'href',
      'https://demo.navet.app/'
    );
  });
});
