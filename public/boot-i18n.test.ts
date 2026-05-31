import { beforeEach, describe, expect, it, vi } from 'vitest';

async function runBootI18nScript() {
  vi.resetModules();
  await import('./boot-i18n.js');
}

describe('boot-i18n', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app-boot-copy"></div>';
    localStorage.clear();
  });

  it('migrates the legacy settings key and resolves boot copy from it', async () => {
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          language: 'sv',
        },
        version: 0,
      })
    );

    await runBootI18nScript();

    expect(document.getElementById('app-boot-copy')?.textContent).toBe(
      'Startar din smarta hemdashboard'
    );
    expect(localStorage.getItem('navet-settings')).toContain('"language":"sv"');
    expect(localStorage.getItem('ha-dashboard-settings')).toBeNull();
  });

  it('prefers the navet settings key when both keys exist', async () => {
    localStorage.setItem(
      'navet-settings',
      JSON.stringify({
        state: {
          language: 'fr',
        },
        version: 0,
      })
    );
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          language: 'sv',
        },
        version: 0,
      })
    );

    await runBootI18nScript();

    expect(document.getElementById('app-boot-copy')?.textContent).toBe(
      'Demarrage de votre tableau de bord domotique'
    );
    expect(localStorage.getItem('ha-dashboard-settings')).toBeNull();
  });
});
