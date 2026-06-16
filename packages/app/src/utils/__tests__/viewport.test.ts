import { setVisualViewportSize } from '@navet/app/test/browser-mocks';
import { describe, expect, it, vi } from 'vitest';
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

  it('resolves logical width from the larger of the visible and layout widths', () => {
    document.documentElement.style.setProperty('--navet-visible-viewport-width', '910px');
    document.documentElement.style.setProperty('--navet-viewport-width', '1280px');

    expect(getLogicalViewportWidth()).toBe(1280);

    document.documentElement.style.removeProperty('--navet-viewport-width');
    expect(getLogicalViewportWidth()).toBe(910);

    document.documentElement.style.removeProperty('--navet-visible-viewport-width');
    document.documentElement.style.setProperty('--navet-viewport-width', '1200px');
    expect(getLogicalViewportWidth()).toBe(1200);
  });

  it('falls back to the larger window viewport when CSS vars are absent', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1365 });
    setVisualViewportSize(1210, 680);

    expect(getLogicalViewportWidth()).toBe(1365);
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

  it('serves synced viewport values without forcing computed-style reads', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
    setVisualViewportSize(1100, 680);
    syncViewportCssVars();

    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle');

    expect(getVisibleViewportSize()).toEqual({ width: 1100, height: 680 });
    expect(getLogicalViewportWidth()).toBe(1280);
    expect(readCssViewportVar('--navet-visible-viewport-width')).toBe(1100);
    expect(getComputedStyleSpy).not.toHaveBeenCalled();
  });

  it('clears synced viewport vars', () => {
    syncViewportCssVars();
    clearViewportCssVars();

    expect(readCssViewportVar('--navet-viewport-width')).toBe(0);
    expect(readCssViewportVar('--navet-visible-viewport-width')).toBe(0);
  });
});
