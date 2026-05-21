from homeassistant.components import panel_custom
from homeassistant.const import CONF_URL

DOMAIN = "navet_ru"

async def async_register_panel(hass, entry):
    """Register a new iframe panel for Navet."""
    # URL для вашего приложения. Используем встроенный сервер HA для простоты.
    # В production лучше использовать GitHub Pages или собственный хостинг.
    panel_url = "/local/navet_ru/index.html" 
    
    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path="navet-ru",
        webcomponent_name="navet-ru",
        sidebar_title="Navet (Русский)",
        sidebar_icon="mdi:home-assistant",
        module_url=panel_url,
        require_admin=False,
        config={},
    )