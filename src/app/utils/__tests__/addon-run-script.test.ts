import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runScript = readFileSync(join(process.cwd(), 'addons/navet/run.sh'), 'utf8');
const shellExpansionStart = '$' + '{';

describe('Home Assistant add-on run script', () => {
  it('defaults blank hass_url to the Supervisor Core endpoint', () => {
    expect(runScript).toContain(
      `RESOLVED_HASS_URL="${shellExpansionStart}HASS_URL:-http://supervisor/core}"`
    );
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
});
