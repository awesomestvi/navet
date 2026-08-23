import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardSizeSelector } from './card-size-selector';

describe('CardSizeSelector', () => {
  beforeEach(() => {
    setMediaQueryMatch('(max-width: 639px)', false);
  });

  it('opens size selection as a cover sheet on phones', () => {
    setMediaQueryMatch('(max-width: 639px)', true);
    renderWithProviders(
      <CardSizeSelector currentSize="medium" onSizeChange={vi.fn()} triggerInline />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resize card' }));

    expect(screen.getByRole('dialog', { name: 'Resize card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close Resize card' })).toBeInTheDocument();
  });

  it('keeps the compact anchored selector on wider screens', () => {
    renderWithProviders(
      <CardSizeSelector currentSize="medium" onSizeChange={vi.fn()} triggerInline />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resize card' }));

    expect(screen.queryByRole('dialog', { name: 'Resize card' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /medium \(2 × 1\)/i })).toBeInTheDocument();
  });
});
