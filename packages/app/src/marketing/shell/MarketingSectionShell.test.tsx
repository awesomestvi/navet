import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingSectionShell } from './MarketingSectionShell';

describe('MarketingSectionShell', () => {
  it('renders title and description content', () => {
    renderWithProviders(
      <MarketingSectionShell title="3 providers." description="Shared surfaces already in motion.">
        <div>Section body</div>
      </MarketingSectionShell>
    );

    expect(screen.getByText('3 providers.')).toBeInTheDocument();
    expect(screen.getByText('Shared surfaces already in motion.')).toBeInTheDocument();
    expect(screen.getByText('Section body')).toBeInTheDocument();
  });

  it('supports editorial sections without dropping their header content', () => {
    renderWithProviders(
      <MarketingSectionShell title="Use the demo. Then run it at home." variant="editorial">
        <div>Editorial section body</div>
      </MarketingSectionShell>
    );

    expect(
      screen.getByRole('heading', { name: 'Use the demo. Then run it at home.' })
    ).toBeInTheDocument();
    expect(screen.getByText('Editorial section body')).toBeInTheDocument();
  });
});
