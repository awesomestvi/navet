import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteConfig = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');

describe('vite Home Assistant proxy', () => {
  it('forwards Home Assistant proxy requests through the OAuth session store', () => {
    expect(viteConfig).toContain('function homeAssistantProxyPlugin(');
    expect(viteConfig).toContain('const authSessionPlugin = authSessionStorePlugin()');
    expect(viteConfig).toContain('getAuthSession(): HomeAssistantAuthData | null');
    expect(viteConfig).toContain("server.middlewares.use('/__navet_ha_proxy__'");
    expect(viteConfig).toContain(
      `headers.set('Authorization', \`Bearer \${authSession.access_token}\`)`
    );
    expect(viteConfig).toContain('Readable.fromWeb(upstreamResponse.body');
  });

  it('requires an OAuth session instead of falling back to NAVET_HASS_URL', () => {
    expect(viteConfig).toContain(`const upstreamBaseUrl = authSession?.hassUrl ?? null`);
    expect(viteConfig).toContain(`Home Assistant OAuth session is required`);
    expect(viteConfig).not.toContain(`normalizedHassUrl?.toString()`);
  });

  it('does not rely on the unauthenticated Vite proxy for /__navet_ha_proxy__', () => {
    expect(viteConfig).not.toContain("'/__navet_ha_proxy__': {");
  });

  it('forwards Homey proxy requests through the Homey session store', () => {
    expect(viteConfig).toContain('function homeyProxyPlugin(');
    expect(viteConfig).toContain('const homeySessionPlugin = homeySessionStorePlugin()');
    expect(viteConfig).toContain('getHomeySession(): HomeySessionData | null');
    expect(viteConfig).toContain("server.middlewares.use('/__navet_homey_proxy__'");
    expect(viteConfig).toContain("server.middlewares.use('/__navet_homey__/session'");
    expect(viteConfig).toContain("server.middlewares.use('/__navet_homey__/authorize'");
    expect(viteConfig).toContain("server.middlewares.use('/__navet_homey__/session/select'");
    expect(viteConfig).toContain(`headers.set('Authorization', \`Bearer \${sessionToken}\`)`);
  });
});
