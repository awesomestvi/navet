"""Config flow for the Navet panel integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import DOMAIN, PANEL_TITLE


class NavetConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Navet."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Create the single Navet panel entry."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title=PANEL_TITLE, data={})

        return self.async_show_form(step_id="user", data_schema=vol.Schema({}))

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Return an empty options flow."""
        return NavetOptionsFlow()


class NavetOptionsFlow(config_entries.OptionsFlow):
    """Handle Navet options."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.OptionsFlowResult:
        """Manage Navet options."""
        if user_input is not None:
            return self.async_create_entry(title="", data={})

        return self.async_show_form(step_id="init", data_schema=vol.Schema({}))
