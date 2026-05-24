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
});
