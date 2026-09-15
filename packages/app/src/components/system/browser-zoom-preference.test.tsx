import { renderWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../stores/settings-store';
import { BrowserZoomPreference } from './browser-zoom-preference';

const { isPanelMode } = vi.hoisted(() => ({ isPanelMode: vi.fn(() => false) }));

vi.mock('@navet/app/runtime/app-mode', () => ({
  isHomeAssistantPanelMode: isPanelMode,
}));

const originalViewport = 'width=device-width, initial-scale=1, maximum-scale=5';

describe('BrowserZoomPreference', () => {
  beforeEach(() => {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = originalViewport;
    document.head.append(viewport);
    isPanelMode.mockReturnValue(false);
    useSettingsStore.getState().updateSettings({ preventBrowserZoom: false });
  });

  afterEach(() => {
    document.querySelector('meta[name="viewport"]')?.remove();
    useSettingsStore.getState().updateSettings({ preventBrowserZoom: false });
  });

  it('preserves user zoom by default and restores it when the opt-in is turned off', () => {
    renderWithProviders(<BrowserZoomPreference />);
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    expect(viewport?.content).toBe(originalViewport);

    act(() => {
      useSettingsStore.getState().updateSettings({ preventBrowserZoom: true });
    });
    expect(viewport?.content).toBe('width=device-width, initial-scale=1, maximum-scale=1');

    act(() => {
      useSettingsStore.getState().updateSettings({ preventBrowserZoom: false });
    });
    expect(viewport?.content).toBe(originalViewport);
  });

  it('does not change the viewport shared with a Home Assistant custom panel', () => {
    isPanelMode.mockReturnValue(true);
    useSettingsStore.getState().updateSettings({ preventBrowserZoom: true });

    renderWithProviders(<BrowserZoomPreference />);

    expect(document.querySelector<HTMLMetaElement>('meta[name="viewport"]')?.content).toBe(
      originalViewport
    );
  });
});
