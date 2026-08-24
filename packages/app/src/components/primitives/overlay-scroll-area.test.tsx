import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverlayScrollArea } from './overlay-scroll-area';

describe('OverlayScrollArea', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces scroll metrics into one animation-frame CSS update', () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        scheduledFrame = callback;
        return 1;
      });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    render(
      <OverlayScrollArea viewportProps={{ 'data-testid': 'viewport' }}>
        <div>Activity</div>
      </OverlayScrollArea>
    );
    const viewport = screen.getByTestId('viewport');
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 200 },
    });

    fireEvent.scroll(viewport);
    fireEvent.scroll(viewport);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    scheduledFrame?.(0);
    expect(viewport.parentElement).toHaveStyle({ '--overlay-scrollbar-start': '32px' });
  });
});
