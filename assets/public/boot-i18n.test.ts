import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function runBootI18nScript() {
  vi.resetModules();
  await import('./boot-i18n.js');
}

describe('boot-i18n', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app-boot-copy"></div>';
    delete document.documentElement.dataset.effectsQuality;
    delete document.documentElement.dataset.lowPower;
    delete document.documentElement.dataset.noAnimation;
    delete document.documentElement.dataset.reducedMotion;
    localStorage.clear();
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0',
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'platform');
    Reflect.deleteProperty(navigator, 'userAgent');
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

  it('applies the low-cost visual tier before first paint on ARM Linux', async () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux aarch64',
    });
    localStorage.setItem(
      'navet-settings',
      JSON.stringify({
        state: {
          effectsQuality: 'high',
          effectsQualityUserOverride: false,
        },
        version: 0,
      })
    );

    await runBootI18nScript();

    expect(document.documentElement.dataset.effectsQuality).toBe('low');
    expect(document.documentElement.dataset.lowPower).toBe('true');
    expect(document.documentElement.dataset.noAnimation).toBe('true');
  });

  it('honors an explicit high-quality device override on ARM Linux', async () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux aarch64',
    });
    localStorage.setItem(
      'navet-settings',
      JSON.stringify({
        state: {
          effectsQuality: 'high',
          effectsQualityUserOverride: true,
        },
        version: 0,
      })
    );

    await runBootI18nScript();

    expect(document.documentElement.dataset.effectsQuality).toBe('high');
    expect(document.documentElement.dataset.lowPower).toBe('false');
    expect(document.documentElement.dataset.noAnimation).toBe('false');
  });
});
