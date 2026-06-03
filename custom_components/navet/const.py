"""Constants for the Navet panel integration."""

from pathlib import Path

DOMAIN = "navet"

PANEL_COMPONENT_NAME = "navet-panel"
PANEL_FRONTEND_PATH = "navet"
PANEL_ICON = "mdi:view-dashboard"
PANEL_TITLE = "Navet"

STATIC_PATH = "/api/navet/static"
RSS_PROXY_PATH = "/__navet_rss_proxy__"
HA_PROXY_PATH = "/__navet_ha_proxy__"
FRONTEND_DIR = Path(__file__).parent / "frontend"
PANEL_ENTRYPOINT = FRONTEND_DIR / "navet-panel.js"

try:
    PANEL_ENTRYPOINT_VERSION = str(int(PANEL_ENTRYPOINT.stat().st_mtime))
except OSError:
    PANEL_ENTRYPOINT_VERSION = "dev"

FRONTEND_MODULE_URL = f"{STATIC_PATH}/navet-panel.js?v={PANEL_ENTRYPOINT_VERSION}"
