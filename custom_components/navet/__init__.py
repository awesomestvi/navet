"""Home Assistant integration for the native Navet panel."""

from __future__ import annotations

import ipaddress
from pathlib import Path
from urllib.parse import urlsplit

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from aiohttp import web

from .const import (
    DOMAIN,
    FRONTEND_MODULE_URL,
    HA_PROXY_PATH,
    PANEL_COMPONENT_NAME,
    PANEL_FRONTEND_PATH,
    PANEL_ICON,
    PANEL_TITLE,
    RSS_PROXY_PATH,
    STATIC_PATH,
)

MAX_FEED_BYTES = 1024 * 1024
RSS_ACCEPT_HEADER = "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9"
RSS_USER_AGENT = "Navet RSS Reader/1.0"
XML_CONTENT_TYPES = (
    "application/rss+xml",
    "application/atom+xml",
    "application/xml",
    "text/xml",
)
PRIVATE_HOSTNAMES = {"localhost", "localhost.", "0.0.0.0"}


def _json_error(status: int, message: str) -> web.Response:
    """Return a no-store JSON error response."""
    return web.json_response(
        {"error": message},
        status=status,
        headers={"Cache-Control": "no-store"},
    )


def _is_private_ip_address(hostname: str) -> bool:
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return False

    return (
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or address.is_unspecified
    )


def _is_blocked_hostname(hostname: str) -> bool:
    normalized_hostname = hostname.lower()
    return (
        normalized_hostname in PRIVATE_HOSTNAMES
        or normalized_hostname.endswith(".local")
        or _is_private_ip_address(normalized_hostname)
    )


def _is_xml_content_type(content_type: str | None) -> bool:
    if not content_type:
        return False

    media_type = content_type.split(";", 1)[0].strip().lower()
    return media_type in XML_CONTENT_TYPES or media_type.endswith("+xml")


class NavetRSSProxyView(HomeAssistantView):
    """Same-origin RSS fetch proxy for the native panel."""

    url = RSS_PROXY_PATH
    name = "api:navet:rss_proxy"
    requires_auth = False

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the RSS proxy view."""
        self._hass = hass

    async def get(self, request: web.Request) -> web.Response:
        """Fetch an HTTPS RSS/Atom feed and return it to the panel."""
        target_url = request.query.get("url", "").strip()

        if not target_url:
            return _json_error(400, "Missing url query parameter")

        parsed_url = urlsplit(target_url)
        if parsed_url.scheme != "https":
            return _json_error(400, "Only HTTPS feeds are allowed")

        if not parsed_url.hostname:
            return _json_error(400, "Invalid feed URL")

        if _is_blocked_hostname(parsed_url.hostname):
            return _json_error(400, "Private feed hosts are not allowed")

        session = async_get_clientsession(self._hass)
        try:
            async with session.get(
                target_url,
                headers={
                    "Accept": RSS_ACCEPT_HEADER,
                    "User-Agent": RSS_USER_AGENT,
                },
            ) as response:
                if not 200 <= response.status < 300:
                    return _json_error(
                        502,
                        f"Upstream feed request failed with status {response.status}",
                    )

                content_type = response.headers.get("Content-Type")
                if not _is_xml_content_type(content_type):
                    return _json_error(
                        502,
                        "Upstream feed returned an unsupported content type",
                    )

                try:
                    content_length = int(response.headers.get("Content-Length") or "0")
                except ValueError:
                    content_length = 0
                if content_length > MAX_FEED_BYTES:
                    return _json_error(502, "Upstream feed is too large")

                body = bytearray()
                async for chunk in response.content.iter_chunked(64 * 1024):
                    body.extend(chunk)
                    if len(body) > MAX_FEED_BYTES:
                        return _json_error(502, "Upstream feed is too large")

                if len(body) > MAX_FEED_BYTES:
                    return _json_error(502, "Upstream feed is too large")

                return web.Response(
                    body=bytes(body),
                    headers={
                        "Cache-Control": "no-store",
                        "Content-Type": content_type,
                        "Referrer-Policy": "strict-origin-when-cross-origin",
                        "X-Content-Type-Options": "nosniff",
                    },
                )
        except Exception:
            return _json_error(502, "Unable to load feed")


class NavetHomeAssistantProxyCompatibilityView(HomeAssistantView):
    """Redirect legacy panel resource proxy URLs back to Home Assistant."""

    url = f"{HA_PROXY_PATH}/{{requested_path:.*}}"
    name = "api:navet:ha_proxy_compat"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        """Redirect proxied HA resource requests to their native same-origin path."""
        requested_path = request.match_info.get("requested_path", "")

        if ".." in requested_path.split("/"):
            return _json_error(400, "Invalid Home Assistant resource path")

        target = f"/{requested_path}"
        if request.query_string:
            target = f"{target}?{request.query_string}"

        raise web.HTTPFound(target)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Navet from a config entry."""
    frontend_dir = Path(__file__).parent / "frontend"
    domain_data = hass.data.setdefault(DOMAIN, {})

    if not domain_data.get("static_path_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_PATH,
                    str(frontend_dir),
                    # The panel entrypoint is an unversioned module URL. Avoid stale HA/browser
                    # caches serving an older navet-panel.js after integration updates.
                    cache_headers=False,
                )
            ]
        )
        domain_data["static_path_registered"] = True

    if not domain_data.get("proxy_views_registered"):
        hass.http.register_view(NavetRSSProxyView(hass))
        hass.http.register_view(NavetHomeAssistantProxyCompatibilityView())
        domain_data["proxy_views_registered"] = True

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_FRONTEND_PATH,
        webcomponent_name=PANEL_COMPONENT_NAME,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=FRONTEND_MODULE_URL,
        embed_iframe=True,
        config={"integration": DOMAIN},
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Navet."""
    async_remove_panel(hass, PANEL_FRONTEND_PATH, warn_if_unknown=False)
    return True
