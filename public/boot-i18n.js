(function () {
  const BOOT_COPY_BY_LANGUAGE = {
    de: 'Starte dein Smart-Home-Dashboard',
    en: 'Starting your smart home dashboard',
    es: 'Iniciando tu panel de hogar inteligente',
    fr: 'Demarrage de votre tableau de bord domotique',
    pt: 'Iniciando o seu painel de casa inteligente',
    sv: 'Startar din smarta hemdashboard',
    zh: '正在启动你的智能家居仪表板',
  };

  function resolveLanguage() {
    try {
      const raw = localStorage.getItem('ha-dashboard-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        const language =
          parsed &&
          parsed.state &&
          typeof parsed.state.language === 'string' &&
          parsed.state.language;
        if (language && BOOT_COPY_BY_LANGUAGE[language]) {
          return language;
        }
      }
    } catch (_) {
      // Ignore and fallback to browser language.
    }

    const navigatorLanguage =
      (navigator.language || (navigator.languages && navigator.languages[0]) || 'en')
        .toLowerCase()
        .split(/[-_]/)[0];
    return BOOT_COPY_BY_LANGUAGE[navigatorLanguage] ? navigatorLanguage : 'en';
  }

  const language = resolveLanguage();
  const copyNode = document.getElementById('app-boot-copy');
  if (copyNode) {
    copyNode.textContent = BOOT_COPY_BY_LANGUAGE[language] || BOOT_COPY_BY_LANGUAGE.en;
  }
})();
