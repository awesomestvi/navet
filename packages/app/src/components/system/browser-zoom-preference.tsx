import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useLayoutEffect } from 'react';

function limitViewportZoom(content: string): string {
  const directives = content
    .split(',')
    .map((directive) => directive.trim())
    .filter((directive) => directive && !/^maximum-scale\s*=/i.test(directive));

  return [...directives, 'maximum-scale=1'].join(', ');
}

export function BrowserZoomPreference() {
  const preventBrowserZoom = useSettingsStore((state) => state.preventBrowserZoom);

  useLayoutEffect(() => {
    // A custom panel shares Home Assistant's document and must not change its viewport.
    if (!preventBrowserZoom || isHomeAssistantPanelMode()) {
      return;
    }

    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewport) {
      return;
    }

    const originalContent = viewport.getAttribute('content') ?? '';
    viewport.setAttribute('content', limitViewportZoom(originalContent));

    return () => {
      viewport.setAttribute('content', originalContent);
    };
  }, [preventBrowserZoom]);

  return null;
}
