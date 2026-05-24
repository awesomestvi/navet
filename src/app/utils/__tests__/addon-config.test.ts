import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const addonConfig = readFileSync(join(process.cwd(), 'addons/navet/config.yaml'), 'utf8');
const devAddonConfig = readFileSync(join(process.cwd(), 'addons/navet-dev/config.yaml'), 'utf8');

describe('Home Assistant add-on config', () => {
  it('keeps ingress internal port enabled without publishing the host port by default', () => {
    for (const config of [addonConfig, devAddonConfig]) {
      expect(config).toContain('ingress: true');
      expect(config).toContain('ingress_port: 8099');
      expect(config).toContain('  8099/tcp: null');
      expect(config).not.toContain('  8099/tcp: 8099');
    }
  });

  it('does not expose Home Assistant URL or token as default options', () => {
    for (const config of [addonConfig, devAddonConfig]) {
      expect(config).not.toContain('options:\n  dashboard_config_url: ""\n  hass_url:');
      expect(config).not.toContain('options:\n  dashboard_config_url: ""\n  token:');
    }
  });

  it('accepts stale Home Assistant URL and token keys for installed add-on migrations', () => {
    for (const config of [addonConfig, devAddonConfig]) {
      expect(config).toContain(
        'schema:\n  dashboard_config_url: str?\n  hass_url: str?\n  token: password?'
      );
    }
  });
});
