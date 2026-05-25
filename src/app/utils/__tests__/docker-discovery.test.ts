import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dockerEntrypoint = readFileSync(join(process.cwd(), 'docker/30-navet-config.sh'), 'utf8');
const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');
const nginxConfig = readFileSync(join(process.cwd(), 'docker/nginx.conf'), 'utf8');
const discoverySnippet = readFileSync(
  join(process.cwd(), 'docker/snippets/navet-discovery.conf'),
  'utf8'
);
const haProxyScript = readFileSync(join(process.cwd(), 'docker/njs/ha-proxy.template.js'), 'utf8');

describe('Docker Home Assistant discovery', () => {
  it('generates a credential-free Home Assistant discovery payload at startup', () => {
    expect(dockerEntrypoint).toContain('navet-discovery-home-assistant.json');
    expect(dockerEntrypoint).toContain('http://homeassistant.local:8123');
    expect(dockerEntrypoint).toContain('http://homeassistant:8123');
    expect(dockerEntrypoint).not.toContain('HASS_TOKEN_JS');
    expect(dockerEntrypoint).not.toContain('refresh_token');
  });

  it('exposes discovery through a no-store endpoint in the standalone Docker image', () => {
    expect(dockerfile).toContain('navet-discovery.conf');
    expect(nginxConfig).toContain('include /etc/nginx/snippets/navet-discovery.conf;');
    expect(discoverySnippet).toContain('location = /__navet_discovery__/home-assistant');
    expect(discoverySnippet).toContain('add_header Cache-Control "no-store" always;');
  });

  it('keeps the Home Assistant proxy available for OAuth media requests', () => {
    expect(dockerEntrypoint).toContain('/etc/navet-nginx/ha-proxy.template.js');
    expect(dockerEntrypoint).toContain('/etc/nginx/njs/ha-proxy.js');
    expect(dockerEntrypoint).toContain('/etc/navet-nginx/default.conf');
    expect(dockerfile).toContain(
      'COPY docker/njs/ha-proxy.template.js /etc/navet-nginx/ha-proxy.template.js'
    );
    expect(nginxConfig).toContain('location = /__navet_ha_proxy__/api/websocket');
    expect(nginxConfig).toContain('location /__navet_ha_proxy__/ {');
    expect(nginxConfig).toContain('proxy_set_header Authorization $navet_ha_proxy_auth_header;');
    expect(haProxyScript).toContain("const AUTH_PATH = '/data/navet-auth-session.json';");
    expect(haProxyScript).toContain('access_token');
    expect(haProxyScript).toContain("typeof r.headersIn.Authorization === 'string'");
    expect(haProxyScript).not.toContain('FALLBACK_HASS_URL');
    expect(haProxyScript).toContain("return '';");
  });
});
