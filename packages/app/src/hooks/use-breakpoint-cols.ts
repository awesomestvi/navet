import { getLogicalViewportWidth } from '@navet/app/utils/viewport';
import { useCallback, useState } from 'react';
import { settingsSelectors } from '../stores/selectors';
import { useSettingsStore } from '../stores/settings-store';
import { useViewportResize } from './use-viewport-resize';

const MD_BREAKPOINT = 768;
const XL_BREAKPOINT = 1280;
const XXL_BREAKPOINT = 1700;
const FOUR_XL_BREAKPOINT = 2500;

/**
 * Returns the zone grid column count for the current viewport, matching the
 * same breakpoints used by room views across the dashboard.
 *
 * | Breakpoint | Width    | Default | More space |
 * |----------- |----------|---------|------------|
 * | base       | < 768px  | 2       | 2          |
 * | md         | 768px+   | 4       | 6          |
 * | xl         | 1280px+  | 6       | 8          |
 * | 2xl        | 1700px+  | 8       | 10         |
 * | 4xl        | 2500px+  | 12      | 14         |
 *
 * More-space mode increases dashboard density by two logical columns at each
 * non-mobile breakpoint.
 */
export function useBreakpointCols(): number {
  const [logicalViewportWidth, setLogicalViewportWidth] = useState(() => getLogicalViewportWidth());
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);

  const syncLogicalViewportWidth = useCallback(() => {
    const nextWidth = getLogicalViewportWidth();
    setLogicalViewportWidth((previous) => (previous === nextWidth ? previous : nextWidth));
  }, []);

  useViewportResize(syncLogicalViewportWidth);

  const isMoreSpace = dashboardSpaceMode === 'more_space';

  if (logicalViewportWidth >= FOUR_XL_BREAKPOINT) return isMoreSpace ? 14 : 12;
  if (logicalViewportWidth >= XXL_BREAKPOINT) return isMoreSpace ? 10 : 8;
  if (logicalViewportWidth >= XL_BREAKPOINT) return isMoreSpace ? 8 : 6;
  if (logicalViewportWidth >= MD_BREAKPOINT) return isMoreSpace ? 6 : 4;
  return 2;
}
