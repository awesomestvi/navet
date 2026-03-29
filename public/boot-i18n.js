(function () {
  var BOOT_COPY_BY_LANGUAGE = {
    de: 'Starte dein Smart-Home-Dashboard',
    en: 'Starting your smart home dashboard',
    es: 'Iniciando tu panel de hogar inteligente',
    fr: 'Demarrage de votre tableau de bord domotique',
    sv: 'Startar din smarta hemdashboard',
  };

  function resolveLanguage() {
    try {
      var raw = localStorage.getItem('ha-dashboard-settings');
      if (raw) {
        var parsed = JSON.parse(raw);
        var language =
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

    var navigatorLanguage =
      (navigator.language || (navigator.languages && navigator.languages[0]) || 'en')
        .toLowerCase()
        .split(/[-_]/)[0];
    return BOOT_COPY_BY_LANGUAGE[navigatorLanguage] ? navigatorLanguage : 'en';
  }

  var language = resolveLanguage();
  var copyNode = document.getElementById('app-boot-copy');
  if (copyNode) {
    copyNode.textContent = BOOT_COPY_BY_LANGUAGE[language] || BOOT_COPY_BY_LANGUAGE.en;
  }
})();
