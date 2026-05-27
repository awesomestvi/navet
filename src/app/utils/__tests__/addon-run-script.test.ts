import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runScript = readFileSync(join(process.cwd(), 'addons/navet/run.sh'), 'utf8');
describe('Home Assistant add-on run script', () => {
  it('does not read Home Assistant URL or token from add-on options', () => {
    expect(runScript).not.toContain("bashio::config 'hass_url'");
    expect(runScript).not.toContain("bashio::config 'token'");
    expect(runScript).not.toContain('HASS_TOKEN_JS');
  });

  it('defaults the add-on proxy upstream to the internal Home Assistant Core endpoint', () => {
    expect(runScript).toContain('RESOLVED_HASS_PROXY_BASE="http://supervisor/core"');
  });

  it('uses the resolved Home Assistant URL in nginx proxy_pass only', () => {
    expect(runScript).toContain(`proxy_pass \${RESOLVED_HASS_PROXY_BASE}/;`);
    expect(runScript).toContain(`proxy_pass \${RESOLVED_HASS_PROXY_BASE}/websocket;`);
    expect(runScript).not.toContain(`proxy_pass \${HASS_URL}/;`);
  });

  it('always emits the Home Assistant proxy location for add-on ingress assets and media', () => {
    expect(runScript).toContain('location /__navet_ha_proxy__/');
    expect(runScript).toContain('location /__navet_homey_proxy__/');
    expect(runScript).toContain('include /etc/nginx/snippets/navet-homey-store.conf;');
    expect(runScript).not.toContain(`if [[ -n "\${RESOLVED_HASS_URL}" ]]; then`);
  });

  it('keeps websocket proxy auth server-side when Supervisor provides a token', () => {
    const websocketLocation = runScript.slice(
      runScript.indexOf('location = /__navet_ha_proxy__/api/websocket'),
      runScript.indexOf('location /__navet_ha_proxy__/')
    );

    expect(websocketLocation).toContain(`proxy_pass \${RESOLVED_HASS_PROXY_BASE}/websocket;`);
    expect(runScript).toContain('proxy_set_header Authorization "Bearer ');
    expect(websocketLocation).toContain(`\${PROXY_AUTH_DIRECTIVE}`);
  });

  it('strips forwarded proxy headers from Home Assistant proxy requests', () => {
    expect(runScript).toContain('proxy_set_header Forwarded "";');
    expect(runScript).toContain('proxy_set_header X-Forwarded-For "";');
    expect(runScript).toContain('proxy_set_header X-Forwarded-Host "";');
    expect(runScript).toContain('proxy_set_header X-Forwarded-Proto "";');
    expect(runScript).toContain('proxy_set_header X-Real-IP "";');
  });

  it('does not write Home Assistant tokens into frontend runtime config', () => {
    expect(runScript).not.toContain('hassToken');
  });
});
