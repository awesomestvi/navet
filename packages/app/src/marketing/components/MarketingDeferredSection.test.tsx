import { renderWithProviders } from '@navet/app/test/render';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketingDeferredSection } from './MarketingDeferredSection';

describe('MarketingDeferredSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('waits for viewport proximity instead of loading below-fold content while idle', () => {
    let reveal: (() => void) | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const requestIdleCallback = vi.fn();
    let observedRootMargin = '';

    class TestIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        reveal = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this);
        observedRootMargin = options?.rootMargin ?? '';
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = observedRootMargin;
      scrollMargin = '0px';
      thresholds = [0];
    }

    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);

    renderWithProviders(
      <MarketingDeferredSection fallback={<div>Section placeholder</div>}>
        <div>Deferred section</div>
      </MarketingDeferredSection>
    );

    expect(screen.getByText('Section placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Deferred section')).not.toBeInTheDocument();
    expect(requestIdleCallback).not.toHaveBeenCalled();
    expect(observedRootMargin).toBe('100% 0px');

    act(() => reveal?.());

    expect(screen.getByText('Deferred section')).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });
});
