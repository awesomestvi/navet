(function () {
  const SETTINGS_KEY = 'navet-settings';
  const LEGACY_SETTINGS_KEY = 'ha-dashboard-settings';
  const BOOT_COPY_BY_LANGUAGE = {
    de: 'Starte dein Smart-Home-Dashboard',
    en: 'Starting your smart home dashboard',
    es: 'Iniciando tu panel de hogar inteligente',
    fr: 'Demarrage de votre tableau de bord domotique',
    pt: 'Iniciando o seu painel de casa inteligente',
    sv: 'Startar din smarta hemdashboard',
    zh: '正在启动你的智能家居仪表板',
  };

  function loadSettingsState() {
    try {
      let raw = localStorage.getItem(SETTINGS_KEY);
      const legacyRaw = localStorage.getItem(LEGACY_SETTINGS_KEY);

      if (!raw && legacyRaw) {
        localStorage.setItem(SETTINGS_KEY, legacyRaw);
        localStorage.removeItem(LEGACY_SETTINGS_KEY);
        raw = legacyRaw;
      } else if (raw && legacyRaw) {
        localStorage.removeItem(LEGACY_SETTINGS_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.state && typeof parsed.state === 'object') {
          return parsed.state;
        }
      }
    } catch (_) {
      // Ignore unavailable or damaged browser storage.
    }

    return {};
  }

  function resolveLanguage(settings) {
    const configuredLanguage =
      typeof settings.language === 'string' ? settings.language : '';
    if (configuredLanguage && BOOT_COPY_BY_LANGUAGE[configuredLanguage]) {
      return configuredLanguage;
    }

    const navigatorLanguage =
      (navigator.language || (navigator.languages && navigator.languages[0]) || 'en')
        .toLowerCase()
        .split(/[-_]/)[0];
    return BOOT_COPY_BY_LANGUAGE[navigatorLanguage] ? navigatorLanguage : 'en';
  }

  function isArmLinuxBrowser() {
    const identity = [navigator.platform, navigator.userAgent].filter(Boolean).join(' ');
    return (
      /\blinux\b/i.test(identity) &&
      /\b(?:aarch64|arm64|armv\d+l?|arm)\b/i.test(identity) &&
      !/\bandroid\b/i.test(identity)
    );
  }

  function applyBootVisualQuality(settings) {
    const configuredQuality =
      settings.effectsQuality === 'low' ||
      settings.effectsQuality === 'medium' ||
      settings.effectsQuality === 'high'
        ? settings.effectsQuality
        : 'high';
    const autoLowPower =
      settings.effectsQualityUserOverride !== true && isArmLinuxBrowser();
    const reducedByLegacyMode =
      settings.lowPowerMode === true && configuredQuality === 'high';
    const effectsQuality =
      autoLowPower || reducedByLegacyMode ? 'low' : configuredQuality;
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const noAnimation =
      settings.disableAnimations === true ||
      effectsQuality === 'low' ||
      reducedMotion;
    const root = document.documentElement;

    root.dataset.effectsQuality = effectsQuality;
    root.dataset.lowPower = effectsQuality === 'low' ? 'true' : 'false';
    root.dataset.noAnimation = noAnimation ? 'true' : 'false';
    root.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }

  const settings = loadSettingsState();
  applyBootVisualQuality(settings);

  const language = resolveLanguage(settings);
  const copyNode = document.getElementById('app-boot-copy');
  if (copyNode) {
    copyNode.textContent = BOOT_COPY_BY_LANGUAGE[language] || BOOT_COPY_BY_LANGUAGE.en;
  }
})();
