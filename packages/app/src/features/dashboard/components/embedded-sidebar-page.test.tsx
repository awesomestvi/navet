import { renderWithProviders } from '@navet/app/test/render';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedSidebarPage } from './embedded-sidebar-page';

describe('EmbeddedSidebarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows a blocked fallback when the iframe never loads', () => {
    renderWithProviders(
      <EmbeddedSidebarPage title="Movie status" url="https://example.com/status" />
    );

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    expect(screen.getByText('This page may be blocking embedding')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Open externally' }).length).toBeGreaterThan(0);
  });

  it('clears the fallback when the iframe load event arrives', () => {
    renderWithProviders(
      <EmbeddedSidebarPage title="Movie status" url="https://example.com/status" />
    );

    act(() => {
      vi.advanceTimersByTime(8_000);
    });
    act(() => {
      fireEvent.load(screen.getByTitle('Movie status'));
    });

    expect(screen.queryByText('This page may be blocking embedding')).not.toBeInTheDocument();
  });

  it('opens the target externally from the fallback action', () => {
    renderWithProviders(
      <EmbeddedSidebarPage title="Movie status" url="https://example.com/status" />
    );

    act(() => {
      vi.advanceTimersByTime(8_000);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Open externally' })[0]);

    expect(window.open).toHaveBeenCalledWith(
      'https://example.com/status',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
