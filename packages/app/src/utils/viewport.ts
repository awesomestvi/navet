export function readCssViewportVar(name: string) {
  if (typeof window === 'undefined') {
    return 0;
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

  const cssVisibleViewportWidth = readCssViewportVar('--navet-visible-viewport-width');
  if (cssVisibleViewportWidth > 0) {
    return cssVisibleViewportWidth;
  }

  const cssViewportWidth = readCssViewportVar('--navet-viewport-width');
  if (cssViewportWidth > 0) {
    return cssViewportWidth;
  }

  const visibleViewportWidth = window.visualViewport?.width ?? window.innerWidth;
  return visibleViewportWidth;
}

export function syncViewportCssVars() {
  if (typeof window === 'undefined') {
    return;
  }

  const visibleViewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const visibleViewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const layoutViewportWidth = Math.max(window.innerWidth, visibleViewportWidth);
  const layoutViewportHeight = Math.max(window.innerHeight, visibleViewportHeight);

  document.documentElement.style.setProperty('--navet-viewport-width', `${layoutViewportWidth}px`);
  document.documentElement.style.setProperty(
    '--navet-viewport-height',
    `${layoutViewportHeight}px`
  );
  document.documentElement.style.setProperty(
    '--navet-visible-viewport-width',
    `${visibleViewportWidth}px`
  );
  document.documentElement.style.setProperty(
    '--navet-visible-viewport-height',
    `${visibleViewportHeight}px`
  );
}

export function clearViewportCssVars() {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.removeProperty('--navet-viewport-width');
  document.documentElement.style.removeProperty('--navet-viewport-height');
  document.documentElement.style.removeProperty('--navet-visible-viewport-width');
  document.documentElement.style.removeProperty('--navet-visible-viewport-height');
}
