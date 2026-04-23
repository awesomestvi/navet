import { useCallback, useState } from 'react';
import { getLogicalViewportWidth } from '@/app/utils/viewport';
import { useViewportResize } from './use-viewport-resize';

const MD_BREAKPOINT = 768;
const XL_BREAKPOINT = 1280;
const XXL_BREAKPOINT = 1700;
const FOUR_XL_BREAKPOINT = 2500;

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
  const [logicalViewportWidth, setLogicalViewportWidth] = useState(() => getLogicalViewportWidth());

  const syncLogicalViewportWidth = useCallback(() => {
    const nextWidth = getLogicalViewportWidth();
    setLogicalViewportWidth((previous) => (previous === nextWidth ? previous : nextWidth));
  }, []);

  useViewportResize(syncLogicalViewportWidth);

  if (logicalViewportWidth >= FOUR_XL_BREAKPOINT) return 12;
  if (logicalViewportWidth >= XXL_BREAKPOINT) return 8;
  if (logicalViewportWidth >= XL_BREAKPOINT) return 6;
  if (logicalViewportWidth >= MD_BREAKPOINT) return 4;
  return 2;
}
