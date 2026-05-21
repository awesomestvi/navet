DOMAIN = "navet_ru"

async def async_setup_entry(hass, entry):
    """Set up Navet RU integration from a config entry."""
    # Регистрируем путь к панели
    hass.http.register_static_path(f"/{DOMAIN}/www", hass.config.path("www"), False)
    
    # Создаем представление для встраивания панели
    from .panel import async_register_panel
    await async_register_panel(hass, entry)
    
    return True