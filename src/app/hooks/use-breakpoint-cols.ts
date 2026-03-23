import { useMediaQuery } from './use-media-query';

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
  const isMd = useMediaQuery('(min-width: 768px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const is2xl = useMediaQuery('(min-width: 1700px)');
  const is4xl = useMediaQuery('(min-width: 2500px)');

  if (is4xl) return 12;
  if (is2xl) return 8;
  if (isXl) return 6;
  if (isMd) return 4;
  return 2;
}
