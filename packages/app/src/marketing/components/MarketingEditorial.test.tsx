import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingPillGroup } from './MarketingEditorial';

describe('MarketingPillGroup', () => {
  it('renders all items in compact scroll mode', () => {
    renderWithProviders(
      <MarketingPillGroup
        items={['3 providers', '30+ shared surfaces', 'Wall panels to phones']}
        compactMobile
        mobileBehavior="scroll"
      />
    );

    expect(screen.getByText('3 providers')).toBeInTheDocument();
    expect(screen.getByText('30+ shared surfaces')).toBeInTheDocument();
    expect(screen.getByText('Wall panels to phones')).toBeInTheDocument();
  });
});
