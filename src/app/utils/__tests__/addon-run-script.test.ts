import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runScript = readFileSync(join(process.cwd(), 'addons/navet/run.sh'), 'utf8');
const shellExpansionStart = '$' + '{';

describe('Home Assistant add-on run script', () => {
  it('defaults blank hass_url to the internal Home Assistant Core endpoint', () => {
    expect(runScript).toContain(
      `RESOLVED_HASS_URL="${shellExpansionStart}HASS_URL:-http://homeassistant:8123}"`
    );
  });

  it('maps the old Supervisor Core URL to the user-token Home Assistant endpoint', () => {
    expect(runScript).toContain(
      `if [[ "${shellExpansionStart}RESOLVED_HASS_URL}" == "http://supervisor/core" ]]; then`
    );
    expect(runScript).toContain('RESOLVED_HASS_URL="http://homeassistant:8123"');
  });

  it('normalizes configured Home Assistant URLs before writing proxy targets', () => {
    expect(runScript).toContain(`RESOLVED_HASS_URL="${shellExpansionStart}RESOLVED_HASS_URL%/}"`);
  });

  it('uses the resolved Home Assistant URL in config.js and nginx proxy_pass', () => {
    expect(runScript).toContain(
      `HASS_URL_JS="${shellExpansionStart}RESOLVED_HASS_URL//\\\\/\\\\\\\\}"`
    );
    expect(runScript).toContain(`proxy_pass ${shellExpansionStart}RESOLVED_HASS_URL}/;`);
    expect(runScript).not.toContain(`proxy_pass ${shellExpansionStart}HASS_URL}/;`);
  });

  it('always emits the Home Assistant proxy location for add-on ingress', () => {
    expect(runScript).toContain('location /__navet_ha_proxy__/');
    expect(runScript).not.toContain(`if [[ -n "${shellExpansionStart}HASS_URL}" ]]; then`);
  });

  it('keeps websocket auth on the Home Assistant websocket message', () => {
    const websocketLocation = runScript.slice(
      runScript.indexOf('location = /__navet_ha_proxy__/api/websocket'),
      runScript.indexOf('location /__navet_ha_proxy__/')
    );

    expect(websocketLocation).toContain(
      `proxy_pass ${shellExpansionStart}RESOLVED_HASS_URL}/api/websocket;`
    );
    expect(websocketLocation).not.toContain('proxy_set_header Authorization');
  });

  it('rejects tokens with spaces or line breaks before writing runtime config', () => {
    expect(runScript).toContain(
      `if [[ "${shellExpansionStart}HASS_TOKEN}" =~ [[:space:][:cntrl:]] ]]; then`
    );
    expect(runScript).toContain(
      'token must be a Home Assistant long-lived access token without spaces or line breaks'
    );
  });
});
