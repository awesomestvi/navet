import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EntityCardTitleBlock } from '../entity-card-title-block';

describe('EntityCardTitleBlock', () => {
  it('capitalizes lowercase eyebrow subtitles for entity type labels', () => {
    renderWithProviders(
      <EntityCardTitleBlock title="Desk Power" subtitle="switch" layout="eyebrow-first" />
    );

    expect(screen.getByText('Switch')).toHaveClass('mb-px');
  });

  it('preserves subtitles that already use display casing', () => {
    renderWithProviders(
      <EntityCardTitleBlock title="Living Room TV" subtitle="TV" layout="eyebrow-first" />
    );

    expect(screen.getByText('TV')).toBeInTheDocument();
  });

  it('adds optical separation only when the eyebrow precedes the title', () => {
    const { rerender } = renderWithProviders(
      <EntityCardTitleBlock
        title="Energy usage"
        subtitle="Live power demand"
        layout="title-first"
      />
    );

    expect(screen.getByText('Live power demand')).not.toHaveClass('mb-px');

    rerender(
      <EntityCardTitleBlock title="Heating loop" subtitle="Energy" layout="eyebrow-first" />
    );

    expect(screen.getByText('Energy')).toHaveClass('mb-px');
  });
});
