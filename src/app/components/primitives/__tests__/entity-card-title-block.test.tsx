import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { EntityCardTitleBlock } from '../entity-card-title-block';

describe('EntityCardTitleBlock', () => {
  it('capitalizes lowercase eyebrow subtitles for entity type labels', () => {
    renderWithProviders(
      <EntityCardTitleBlock title="Desk Power" subtitle="switch" layout="eyebrow-first" />
    );

    expect(screen.getByText('Switch')).toBeInTheDocument();
  });

  it('preserves subtitles that already use display casing', () => {
    renderWithProviders(
      <EntityCardTitleBlock title="Living Room TV" subtitle="TV" layout="eyebrow-first" />
    );

    expect(screen.getByText('TV')).toBeInTheDocument();
  });
});
