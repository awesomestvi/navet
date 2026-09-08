import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaSeekTimeline } from '../media-seek-timeline';

const appearance = {
  className: 'flex items-center gap-2',
  labelClassName: 'tabular-nums',
  labelStyle: {},
  rootClassName: 'h-4',
  thumbClassName: 'h-3 w-3',
  trackStyle: {},
  rangeStyle: {},
  thumbStyle: {},
};

describe('MediaSeekTimeline', () => {
  it('commits keyboard seeking through the shared slider', () => {
    const onSeek = vi.fn();
    renderWithProviders(
      <MediaSeekTimeline
        {...appearance}
        elapsedSeconds={30}
        durationSeconds={120}
        canSeek
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('slider', { name: /seek/i }), { key: 'End' });
    expect(onSeek).toHaveBeenCalledWith(120);
  });

  it.each([
    { durationSeconds: 0, canSeek: true },
    { durationSeconds: 120, canSeek: false },
  ])('keeps unsupported seeking inert: %j', ({ durationSeconds, canSeek }) => {
    const onSeek = vi.fn();
    renderWithProviders(
      <MediaSeekTimeline
        {...appearance}
        elapsedSeconds={30}
        durationSeconds={durationSeconds}
        canSeek={canSeek}
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('slider', { name: /seek/i }), { key: 'End' });
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('tracks provider progress when the user is not seeking', () => {
    const onSeek = vi.fn();
    const { rerender } = renderWithProviders(
      <MediaSeekTimeline
        {...appearance}
        elapsedSeconds={30}
        durationSeconds={120}
        canSeek
        onSeek={onSeek}
      />
    );
    expect(screen.getByRole('slider', { name: /seek/i })).toHaveAttribute('aria-valuenow', '30');
    rerender(
      <MediaSeekTimeline
        {...appearance}
        elapsedSeconds={45}
        durationSeconds={120}
        canSeek
        onSeek={onSeek}
      />
    );
    expect(screen.getByRole('slider', { name: /seek/i })).toHaveAttribute('aria-valuenow', '45');
    expect(onSeek).not.toHaveBeenCalled();
  });
});
