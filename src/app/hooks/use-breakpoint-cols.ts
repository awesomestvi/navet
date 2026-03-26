import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/app/stores';
import { settingsSelectors } from '@/app/stores/selectors';

const MD_BREAKPOINT = 768;
const XL_BREAKPOINT = 1280;
const XXL_BREAKPOINT = 1700;
const FOUR_XL_BREAKPOINT = 2500;

function getLogicalViewportWidth(pageZoomScale: number) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const cssVisibleViewportWidth = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--navet-visible-viewport-width')
  );
  if (Number.isFinite(cssVisibleViewportWidth) && cssVisibleViewportWidth > 0) {
    return cssVisibleViewportWidth / pageZoomScale;
  }

  const cssViewportWidth = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--navet-viewport-width')
  );

  if (Number.isFinite(cssViewportWidth) && cssViewportWidth > 0) {
    return cssViewportWidth;
  }

  const visibleViewportWidth = window.visualViewport?.width ?? window.innerWidth;
  return visibleViewportWidth / pageZoomScale;
}

/**
 * Returns the zone grid column count for the current viewport, matching the
 * same breakpoints used by room views across the dashboard.
 *
 * | Breakpoint   | Width    | Columns |
 * |------------- |----------|---------|
 * | < md         | < 768px  | 2       |
 * | md           | 768px+   | 4       |
 * | xl           | 1280px+  | 6       |
 * | 2xl          | 1700px+  | 8       |
 * | 4xl          | 2500px+  | 12      |
 */
export function useBreakpointCols(): number {
  const pageZoom = useSettingsStore(settingsSelectors.pageZoom);
  const pageZoomScale = pageZoom / 100;
  const [logicalViewportWidth, setLogicalViewportWidth] = useState(() =>
    getLogicalViewportWidth(pageZoomScale)
  );

  useEffect(() => {
    let frameId: number | null = null;

    const syncLogicalViewportWidth = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const nextWidth = getLogicalViewportWidth(pageZoomScale);
        setLogicalViewportWidth((previous) => (previous === nextWidth ? previous : nextWidth));
      });
    };

    syncLogicalViewportWidth();

    window.addEventListener('resize', syncLogicalViewportWidth);
    window.visualViewport?.addEventListener('resize', syncLogicalViewportWidth);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', syncLogicalViewportWidth);
      window.visualViewport?.removeEventListener('resize', syncLogicalViewportWidth);
    };
  }, [pageZoomScale]);

  if (logicalViewportWidth >= FOUR_XL_BREAKPOINT) return 12;
  if (logicalViewportWidth >= XXL_BREAKPOINT) return 8;
  if (logicalViewportWidth > XL_BREAKPOINT) return 6;
  if (logicalViewportWidth >= MD_BREAKPOINT) return 4;
  return 2;
}
