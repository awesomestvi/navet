import { useSettingsStore } from '@navet/app/stores/settings-store';
import { emitVisualViewportResize, setVisualViewportSize } from '@navet/app/test/browser-mocks';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBreakpointCols } from '../use-breakpoint-cols';

describe('useBreakpointCols', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the default mode at four columns for iPad Mini landscape widths', () => {
    vi.useFakeTimers();
    setVisualViewportSize(1133, 744);

    const { result } = renderHookWithProviders(() => useBreakpointCols());

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(4);
  });

  it('uses six columns for iPad Mini landscape widths in more-space mode', () => {
    vi.useFakeTimers();
    setVisualViewportSize(1133, 744);
    useSettingsStore.getState().updateSettings({ dashboardSpaceMode: 'more_space' });

    const { result } = renderHookWithProviders(() => useBreakpointCols());

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(6);
  });

  it('promotes the md breakpoint from four to six columns in more-space mode', () => {
    vi.useFakeTimers();
    setVisualViewportSize(900, 744);
    useSettingsStore.getState().updateSettings({ dashboardSpaceMode: 'more_space' });

    const { result } = renderHookWithProviders(() => useBreakpointCols());

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(6);
  });

  it('adds two columns at each desktop breakpoint in more-space mode', () => {
    vi.useFakeTimers();
    setVisualViewportSize(1279, 744);
    useSettingsStore.getState().updateSettings({ dashboardSpaceMode: 'more_space' });

    const { result } = renderHookWithProviders(() => useBreakpointCols());

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(6);

    act(() => {
      setVisualViewportSize(1280, 744);
      emitVisualViewportResize();
      vi.runAllTimers();
    });

    expect(result.current).toBe(8);

    act(() => {
      setVisualViewportSize(1700, 744);
      emitVisualViewportResize();
      vi.runAllTimers();
    });

    expect(result.current).toBe(10);

    act(() => {
      setVisualViewportSize(2500, 744);
      emitVisualViewportResize();
      vi.runAllTimers();
    });

    expect(result.current).toBe(14);
  });

  it('uses the layout viewport width when ingress narrows the visible viewport', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    setVisualViewportSize(1210, 744);

    const { result } = renderHookWithProviders(() => useBreakpointCols());

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe(6);
  });
});
