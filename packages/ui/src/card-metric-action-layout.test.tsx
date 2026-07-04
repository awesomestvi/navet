import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardMetricActionLayout } from './card-metric-action-layout';

describe('CardMetricActionLayout', () => {
  it('anchors metric content above the action row', () => {
    render(
      <CardMetricActionLayout
        size="large"
        metric={<span>68%</span>}
        actions={<button type="button">Open</button>}
      />
    );

    expect(screen.getByText('68%').parentElement).toHaveClass('mt-auto');
    expect(screen.getByRole('button', { name: 'Open' }).parentElement).toHaveClass('pt-4');
  });
});
