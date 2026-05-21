import type { HassConfig, HassEntities, HassUser } from 'home-assistant-js-websocket';
import leafletStylesUrl from 'leaflet/dist/leaflet.css?url';
import { useCallback, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useShallow } from 'zustand/react/shallow';
import { ErrorDisplay } from '@/app/components/shared/error-display';
import { Toaster } from '@/app/components/ui/sonner';
import { DashboardPage } from '@/app/features/dashboard';
import { useAccentColor } from '@/app/hooks';
import { useViewportResize } from '@/app/hooks/use-viewport-resize';
import { I18nProvider } from '@/app/i18n';
import type { HomeAssistantPanelHass } from '@/app/services/home-assistant-panel-adapter';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { startNavigationStoreSync } from '@/app/stores/navigation-store';
import { initializeSearchStore } from '@/app/stores/search-store';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { clearViewportCssVars, syncViewportCssVars } from '@/app/utils/viewport';
import navetPanelStylesUrl from '@/styles/index.css?url';

window.__NAVET_PANEL__ = true;

const PANEL_STYLESHEET_IDS = ['navet-panel-styles', 'navet-panel-leaflet-styles'] as const;
const PANEL_STYLESHEET_LOAD_TIMEOUT_MS = 3000;
let panelStylesReadyPromise: Promise<void> | null = null;

function waitForStylesheet(link: HTMLLinkElement) {
  if (link.sheet) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, PANEL_STYLESHEET_LOAD_TIMEOUT_MS);
    const finish = () => {
      window.clearTimeout(timeout);
      link.removeEventListener('load', finish);
      link.removeEventListener('error', finish);
      resolve();
    };

    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
  });
}

function ensurePanelStyles() {
  if (panelStylesReadyPromise) {
    return panelStylesReadyPromise;
  }

  const stylesheets = [
    { id: PANEL_STYLESHEET_IDS[0], href: navetPanelStylesUrl },
    { id: PANEL_STYLESHEET_IDS[1], href: leafletStylesUrl },
  ];
  const links: HTMLLinkElement[] = [];

  for (const { id, href } of stylesheets) {
    const existing = document.getElementById(id);

    if (existing instanceof HTMLLinkElement) {
      if (existing.href !== new URL(href, document.baseURI).href) {
        existing.href = href;
      }
      links.push(existing);
      continue;
    }

    existing?.remove();

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
    links.push(link);
  }

  panelStylesReadyPromise = Promise.all(links.map(waitForStylesheet)).then(() => undefined);

  return panelStylesReadyPromise;
}

interface HomeAssistantPanelRoute {
  path?: string;
  prefix?: string;
}

interface HomeAssistantPanelInfo {
  config?: Record<string, unknown>;
}

interface HomeAssistantPanelProps {
  hass: HomeAssistantPanelHass | null;
  narrow: boolean;
  route: HomeAssistantPanelRoute | null;
  panel: HomeAssistantPanelInfo | null;
}

function PanelRuntime({ hass }: HomeAssistantPanelProps) {
  const accentColor = useAccentColor();
  const { disableAnimations, lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow(settingsSelectors.displaySettings)
  );
  const resolvedEffectsQuality = resolveEffectsQuality(
    effectsQuality,
    disableAnimations || lowPowerMode
  );
  const reducedEffectsEnabled = resolvedEffectsQuality === 'low';

  const syncViewportEnvironment = useCallback(() => {
    syncViewportCssVars();
  }, []);

  useViewportResize(syncViewportEnvironment);

  useEffect(() => {
    initializeSearchStore();
    return startNavigationStoreSync();
  }, []);

  useEffect(() => {
    syncViewportEnvironment();

    return () => {
      clearViewportCssVars();
    };
  }, [syncViewportEnvironment]);

  useEffect(() => {
    document.documentElement.style.setProperty('--navet-accent', accentColor);
    return () => {
      document.documentElement.style.removeProperty('--navet-accent');
    };
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.noAnimation = reducedEffectsEnabled ? 'true' : 'false';
    document.documentElement.dataset.lowPower = reducedEffectsEnabled ? 'true' : 'false';
    document.documentElement.dataset.effectsQuality = resolvedEffectsQuality;

    return () => {
      delete document.documentElement.dataset.noAnimation;
      delete document.documentElement.dataset.lowPower;
      delete document.documentElement.dataset.effectsQuality;
    };
  }, [reducedEffectsEnabled, resolvedEffectsQuality]);

  useEffect(() => {
    if (!hass) {
      return;
    }

    homeAssistantStore.getState().syncPanelHass(hass);
  }, [hass]);

  if (!hass) {
    return null;
  }

  return (
    <>
      <ErrorDisplay />
      <Toaster />
      <DashboardPage />
    </>
  );
}

function HomeAssistantPanelRoot(props: HomeAssistantPanelProps) {
  return (
    <I18nProvider>
      <PanelRuntime {...props} />
    </I18nProvider>
  );
}

class NavetPanelElement extends HTMLElement {
  private root: Root | null = null;
  private props: HomeAssistantPanelProps = {
    hass: null,
    narrow: false,
    route: null,
    panel: null,
  };
  private hasRendered = false;
  private renderQueued = false;
  private stylesReady = false;

  connectedCallback() {
    this.style.display = 'block';
    this.style.height = '100%';
    this.style.minHeight = '100dvh';
    this.style.visibility = 'hidden';

    void ensurePanelStyles().then(() => {
      if (!this.isConnected) {
        return;
      }

      this.stylesReady = true;
      this.style.visibility = '';

      if (!this.root) {
        this.root = createRoot(this);
      }

      this.queueRender();
    });
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
    this.hasRendered = false;
  }

  set hass(hass: {
    states: HassEntities;
    config: HassConfig;
    user?: HassUser;
    connection?: HomeAssistantPanelHass['connection'];
    callService: HomeAssistantPanelHass['callService'];
    callWS: HomeAssistantPanelHass['callWS'];
  }) {
    const hadInitialHass = this.props.hass !== null;
    this.props = { ...this.props, hass };

    if (!hadInitialHass || !this.stylesReady || !this.root || !this.hasRendered) {
      this.queueRender();
      return;
    }

    homeAssistantStore.getState().syncPanelHass(hass);
  }

  set narrow(narrow: boolean) {
    this.props = { ...this.props, narrow };
    this.queueRender();
  }

  set route(route: HomeAssistantPanelRoute) {
    this.props = { ...this.props, route };
    this.queueRender();
  }

  set panel(panel: HomeAssistantPanelInfo) {
    this.props = { ...this.props, panel };
    this.queueRender();
  }

  private queueRender() {
    if (!this.stylesReady || !this.root || this.renderQueued) {
      return;
    }

    this.renderQueued = true;
    queueMicrotask(() => {
      this.renderQueued = false;
      this.root?.render(<HomeAssistantPanelRoot {...this.props} />);
      this.hasRendered = true;
    });
  }
}

if (!customElements.get('navet-panel')) {
  customElements.define('navet-panel', NavetPanelElement);
}
