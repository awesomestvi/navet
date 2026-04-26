import { describe, expect, it } from 'vitest';
import { setVisualViewportSize } from '@/test/browser-mocks';
import {
  clearViewportCssVars,
  getLogicalViewportWidth,
  getVisibleViewportSize,
  readCssViewportVar,
  syncViewportCssVars,
} from '../viewport';

describe('viewport utils', () => {
  it('reads positive CSS viewport vars', () => {
    document.documentElement.style.setProperty('--navet-visible-viewport-width', '912px');

    expect(readCssViewportVar('--navet-visible-viewport-width')).toBe(912);
    expect(readCssViewportVar('--missing')).toBe(0);
  });

  it('prefers CSS viewport vars over visualViewport metrics', () => {
    setVisualViewportSize(800, 600);
    document.documentElement.style.setProperty('--navet-visible-viewport-width', '900px');
    document.documentElement.style.setProperty('--navet-visible-viewport-height', '700px');

    expect(getVisibleViewportSize()).toEqual({ width: 900, height: 700 });
  });

  it('falls back to visualViewport metrics when CSS vars are absent', () => {
    setVisualViewportSize(840, 620);

    expect(getVisibleViewportSize()).toEqual({ width: 840, height: 620 });
  });

  it('resolves logical width from visible width first, then layout width', () => {
    document.documentElement.style.setProperty('--navet-visible-viewport-width', '910px');
    expect(getLogicalViewportWidth()).toBe(910);

    document.documentElement.style.removeProperty('--navet-visible-viewport-width');
    document.documentElement.style.setProperty('--navet-viewport-width', '1200px');
    expect(getLogicalViewportWidth()).toBe(1200);
  });

  it('syncs viewport CSS vars from the layout and visible viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
    setVisualViewportSize(1100, 680);

    syncViewportCssVars();

    expect(readCssViewportVar('--navet-viewport-width')).toBe(1280);
    expect(readCssViewportVar('--navet-viewport-height')).toBe(720);
    expect(readCssViewportVar('--navet-visible-viewport-width')).toBe(1100);
    expect(readCssViewportVar('--navet-visible-viewport-height')).toBe(680);
  });

  it('clears synced viewport vars', () => {
    syncViewportCssVars();
    clearViewportCssVars();

    expect(readCssViewportVar('--navet-viewport-width')).toBe(0);
    expect(readCssViewportVar('--navet-visible-viewport-width')).toBe(0);
  });
});
