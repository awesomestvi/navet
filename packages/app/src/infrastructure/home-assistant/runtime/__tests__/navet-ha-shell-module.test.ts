import {
  NAVET_HOME_ASSISTANT_SHELL_GLOBAL,
  type NavetHomeAssistantShellApi,
} from '@navet/app/infrastructure/home-assistant/runtime/navet-ha-shell-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNavetHomeAssistantShell } from '../navet-ha-shell-module';

function setWindowPath(pathname: string) {
  window.history.replaceState({}, '', pathname);
}

function renderHomeAssistantShell() {
  document.body.innerHTML = `
    <home-assistant-main>
      <app-header>
        <button id="menu-button" menu></button>
      </app-header>
      <ha-sidebar></ha-sidebar>
      <div id="content"></div>
    </home-assistant-main>
  `;
}

describe('installNavetHomeAssistantShell', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelector('#navet-home-assistant-kiosk-style')?.remove();
    document.documentElement.classList.remove('navet-ha-kiosk-active');
    delete window[NAVET_HOME_ASSISTANT_SHELL_GLOBAL];
    setWindowPath('/');
    vi.restoreAllMocks();
  });

  it('applies styles only on the Navet panel route', async () => {
    renderHomeAssistantShell();
    setWindowPath('/navet');

    const { api, destroy } = installNavetHomeAssistantShell();
    await api.setKioskEnabled(true);

    expect(document.querySelector('app-header')).toHaveStyle({ display: 'none' });

    window.history.pushState({}, '', '/lovelace/0');
    await Promise.resolve();

    expect(document.querySelector('app-header')).not.toHaveStyle({ display: 'none' });
    destroy();
  });

  it('hides both header and sidebar when kiosk is enabled', async () => {
    renderHomeAssistantShell();
    setWindowPath('/navet');

    const { api, destroy } = installNavetHomeAssistantShell();
    await api.setKioskEnabled(true);

    expect(document.querySelector('app-header')).toHaveStyle({ display: 'none' });
    expect(document.querySelector('ha-sidebar')).toHaveStyle({
      display: 'none',
      width: '0px',
    });
    destroy();
  });

  it('reports unavailable shell elements safely when the shell is missing', async () => {
    setWindowPath('/navet');

    const { api, destroy } = installNavetHomeAssistantShell();
    await api.setKioskEnabled(true);

    expect(api.getSnapshot().available).toBe(false);
    destroy();
  });

  it('openSidebar disables kiosk before opening the menu', async () => {
    renderHomeAssistantShell();
    setWindowPath('/navet');
    const menuButton = document.getElementById('menu-button') as HTMLButtonElement;
    const menuClick = vi.fn();
    menuButton.click = menuClick;

    const { api, destroy } = installNavetHomeAssistantShell();
    await api.setKioskEnabled(true);
    await api.openSidebar();

    expect(api.isKioskEnabled()).toBe(false);
    expect(menuClick).toHaveBeenCalled();
    destroy();
  });

  it('registers the parent-window shell API', () => {
    renderHomeAssistantShell();
    setWindowPath('/navet');

    const { destroy } = installNavetHomeAssistantShell();

    expect(window[NAVET_HOME_ASSISTANT_SHELL_GLOBAL]).toBeDefined();
    expect(
      (window[NAVET_HOME_ASSISTANT_SHELL_GLOBAL] as NavetHomeAssistantShellApi).subscribe
    ).toBeTypeOf('function');
    destroy();
  });
});
