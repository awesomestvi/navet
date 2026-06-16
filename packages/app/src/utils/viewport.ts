interface ViewportSnapshot {
  layoutWidth: number;
  layoutHeight: number;
  visibleWidth: number;
  visibleHeight: number;
}

const EMPTY_VIEWPORT_SNAPSHOT: ViewportSnapshot = {
  layoutWidth: 0,
  layoutHeight: 0,
  visibleWidth: 0,
  visibleHeight: 0,
};

let viewportSnapshot: ViewportSnapshot = { ...EMPTY_VIEWPORT_SNAPSHOT };

function readViewportSnapshotValue(name: string) {
  switch (name) {
    case '--navet-viewport-width':
      return viewportSnapshot.layoutWidth;
    case '--navet-viewport-height':
      return viewportSnapshot.layoutHeight;
    case '--navet-visible-viewport-width':
      return viewportSnapshot.visibleWidth;
    case '--navet-visible-viewport-height':
      return viewportSnapshot.visibleHeight;
    default:
      return 0;
  }
}

export function readCssViewportVar(name: string) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const snapshotValue = readViewportSnapshotValue(name);
  if (snapshotValue > 0) {
    return snapshotValue;
  }

  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getVisibleViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  const width =
    readCssViewportVar('--navet-visible-viewport-width') ||
    window.visualViewport?.width ||
    window.innerWidth;
  const height =
    readCssViewportVar('--navet-visible-viewport-height') ||
    window.visualViewport?.height ||
    window.innerHeight;

  return { width, height };
}

export function getLogicalViewportWidth() {
  if (typeof window === 'undefined') {
    return 0;
  }

  const cssViewportWidth = readCssViewportVar('--navet-viewport-width');
  const cssVisibleViewportWidth = readCssViewportVar('--navet-visible-viewport-width');
  const cssLogicalViewportWidth = Math.max(cssViewportWidth, cssVisibleViewportWidth);
  if (cssLogicalViewportWidth > 0) {
    return cssLogicalViewportWidth;
  }

  return Math.max(window.innerWidth, window.visualViewport?.width ?? 0);
}

export function syncViewportCssVars() {
  if (typeof window === 'undefined') {
    return;
  }

  const visibleViewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const visibleViewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const layoutViewportWidth = Math.max(window.innerWidth, visibleViewportWidth);
  const layoutViewportHeight = Math.max(window.innerHeight, visibleViewportHeight);
  const previousSnapshot = viewportSnapshot;

  if (previousSnapshot.layoutWidth !== layoutViewportWidth) {
    document.documentElement.style.setProperty(
      '--navet-viewport-width',
      `${layoutViewportWidth}px`
    );
  }
  if (previousSnapshot.layoutHeight !== layoutViewportHeight) {
    document.documentElement.style.setProperty(
      '--navet-viewport-height',
      `${layoutViewportHeight}px`
    );
  }
  if (previousSnapshot.visibleWidth !== visibleViewportWidth) {
    document.documentElement.style.setProperty(
      '--navet-visible-viewport-width',
      `${visibleViewportWidth}px`
    );
  }
  if (previousSnapshot.visibleHeight !== visibleViewportHeight) {
    document.documentElement.style.setProperty(
      '--navet-visible-viewport-height',
      `${visibleViewportHeight}px`
    );
  }

  viewportSnapshot = {
    layoutWidth: layoutViewportWidth,
    layoutHeight: layoutViewportHeight,
    visibleWidth: visibleViewportWidth,
    visibleHeight: visibleViewportHeight,
  };
}

export function clearViewportCssVars() {
  if (typeof document === 'undefined') {
    return;
  }

  viewportSnapshot = { ...EMPTY_VIEWPORT_SNAPSHOT };
  document.documentElement.style.removeProperty('--navet-viewport-width');
  document.documentElement.style.removeProperty('--navet-viewport-height');
  document.documentElement.style.removeProperty('--navet-visible-viewport-width');
  document.documentElement.style.removeProperty('--navet-visible-viewport-height');
}
