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

  const cssViewportWidth = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--navet-viewport-width')
  );

  if (Number.isFinite(cssViewportWidth) && cssViewportWidth > 0) {
    return cssViewportWidth;
  }

  const viewportWidth = Math.max(window.innerWidth, window.visualViewport?.width ?? 0);
  return viewportWidth / pageZoomScale;
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
    const syncLogicalViewportWidth = () => {
      setLogicalViewportWidth(getLogicalViewportWidth(pageZoomScale));
    };

    syncLogicalViewportWidth();

    window.addEventListener('resize', syncLogicalViewportWidth);
    window.visualViewport?.addEventListener('resize', syncLogicalViewportWidth);

    return () => {
      window.removeEventListener('resize', syncLogicalViewportWidth);
      window.visualViewport?.removeEventListener('resize', syncLogicalViewportWidth);
    };
  }, [pageZoomScale]);

  if (logicalViewportWidth >= FOUR_XL_BREAKPOINT) return 12;
  if (logicalViewportWidth >= XXL_BREAKPOINT) return 8;
  if (logicalViewportWidth >= XL_BREAKPOINT) return 6;
  if (logicalViewportWidth >= MD_BREAKPOINT) return 4;
  return 2;
}
